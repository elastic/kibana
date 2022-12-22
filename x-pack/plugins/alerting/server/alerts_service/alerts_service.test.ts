/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { ReplaySubject, Subject } from 'rxjs';
import { AlertsService } from './alerts_service';

let logger: ReturnType<typeof loggingSystemMock['createLogger']>;
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

const SimulateTemplateResponse = {
  template: {
    aliases: {
      alias_name_1: {
        is_hidden: true,
      },
      alias_name_2: {
        is_hidden: true,
      },
    },
    mappings: { enabled: false },
    settings: {},
  },
};
interface HTTPError extends Error {
  statusCode: number;
}

interface EsError extends Error {
  meta: {
    body: {
      error: {
        type: string;
      };
    };
  };
}

const GetAliasResponse = {
  real_index: {
    aliases: {
      alias_1: {
        is_hidden: true,
      },
      alias_2: {
        is_hidden: true,
      },
    },
  },
};

const IlmPutBody = {
  body: {
    policy: {
      _meta: {
        managed: true,
      },
      phases: {
        hot: {
          actions: {
            rollover: {
              max_age: '30d',
              max_primary_shard_size: '50gb',
            },
          },
        },
      },
    },
  },
  name: 'alerts-default-ilm-policy',
};

const IndexTemplatePutBody = {
  name: '.alerts-test-template',
  body: {
    index_patterns: ['.alerts-test-*'],
    composed_of: ['alerts-default-component-template', 'alerts-test-component-template'],
    template: {
      settings: {
        auto_expand_replicas: '0-1',
        hidden: true,
        'index.lifecycle': {
          name: 'alerts-default-ilm-policy',
          rollover_alias: '.alerts-test',
        },
        'index.mapping.total_fields.limit': 2500,
      },
      mappings: {
        dynamic: false,
      },
    },
    _meta: {
      managed: true,
    },
  },
};

const TestRegistrationContext = {
  registrationContext: 'test',
  fieldMap: { field: { type: 'keyword', required: false } },
};

describe('Alerts Service', () => {
  let pluginStop$: Subject<void>;

  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggingSystemMock.createLogger();
    pluginStop$ = new ReplaySubject(1);
    jest.spyOn(global.Math, 'random').mockReturnValue(0.01);
    clusterClient.indices.simulateTemplate.mockImplementation(async () => SimulateTemplateResponse);
    clusterClient.indices.simulateIndexTemplate.mockImplementation(
      async () => SimulateTemplateResponse
    );
    clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
  });

  afterEach(() => {
    pluginStop$.next();
    pluginStop$.complete();
  });
  describe('initialize()', () => {
    test('should correctly initialize common resources', async () => {
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledWith(IlmPutBody);
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(1);

      const componentTemplate1 = clusterClient.cluster.putComponentTemplate.mock.calls[0][0];
      expect(componentTemplate1.name).toEqual('alerts-default-component-template');
    });

    test('should throw error if adding ILM policy throws error', async () => {
      clusterClient.ilm.putLifecycle.mockRejectedValueOnce(new Error('fail'));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await expect(alertsService.initialize()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure during installation. fail"`
      );

      expect(logger.error).toHaveBeenCalledWith(
        `Error installing ILM policy alerts-default-ilm-policy - fail`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
    });

    test('should throw error if creating/updating common component template throws error', async () => {
      clusterClient.cluster.putComponentTemplate.mockRejectedValueOnce(new Error('fail'));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await expect(alertsService.initialize()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure during installation. fail"`
      );

      expect(logger.error).toHaveBeenCalledWith(
        `Error installing component template alerts-default-component-template - fail`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(1);
    });
  });

  describe('initializeRegistrationContext()', () => {
    test('should correctly initialize all resources for registration context', async () => {
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await alertsService.initializeRegistrationContext(TestRegistrationContext);

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledWith(IlmPutBody);
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);

      const componentTemplate1 = clusterClient.cluster.putComponentTemplate.mock.calls[0][0];
      expect(componentTemplate1.name).toEqual('alerts-default-component-template');
      const componentTemplate2 = clusterClient.cluster.putComponentTemplate.mock.calls[1][0];
      expect(componentTemplate2.name).toEqual('alerts-test-component-template');

      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith(IndexTemplatePutBody);
      expect(clusterClient.indices.getAlias).toHaveBeenCalledWith({ index: '.alerts-test-*' });
      expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.create).toHaveBeenCalledWith({
        index: '.alerts-test-000001',
        body: {
          aliases: {
            '.alerts-test': {
              is_write_index: true,
            },
          },
        },
      });
    });

    test('should skip initialization if registration context already exists', async () => {
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await alertsService.initializeRegistrationContext(TestRegistrationContext);
      await alertsService.initializeRegistrationContext(TestRegistrationContext);

      expect(logger.info).toHaveBeenCalledWith(
        `Resources for registration context "test" have already been installed.`
      );
    });

    test('should throw error if registration context already exists and has been registered with a different field map', async () => {
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await alertsService.initializeRegistrationContext(TestRegistrationContext);
      await expect(
        alertsService.initializeRegistrationContext({
          ...TestRegistrationContext,
          fieldMap: { anotherField: { type: 'keyword', required: false } },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"test has already been registered with a different mapping"`
      );
    });

    test('should not update index template if simulating template throws error', async () => {
      clusterClient.indices.simulateTemplate.mockRejectedValueOnce(new Error('fail'));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await alertsService.initializeRegistrationContext(TestRegistrationContext);

      expect(logger.error).toHaveBeenCalledWith(
        `Failed to simulate index template mappings for .alerts-test-template; not applying mappings - fail`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      // putIndexTemplate is skipped but other operations are called as expected
      expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).toHaveBeenCalled();
      expect(clusterClient.indices.create).toHaveBeenCalled();
    });

    test('should throw error if simulating template returns empty mappings', async () => {
      clusterClient.indices.simulateTemplate.mockImplementationOnce(async () => ({
        ...SimulateTemplateResponse,
        template: {
          ...SimulateTemplateResponse.template,
          mappings: {},
        },
      }));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await expect(
        alertsService.initializeRegistrationContext(TestRegistrationContext)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure during installation. No mappings would be generated for .alerts-test-template, possibly due to failed/misconfigured bootstrapping"`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).not.toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();
    });

    test('should throw error if updating index template throws error', async () => {
      clusterClient.indices.putIndexTemplate.mockRejectedValueOnce(new Error('fail'));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await expect(
        alertsService.initializeRegistrationContext(TestRegistrationContext)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure during installation. fail"`);

      expect(logger.error).toHaveBeenCalledWith(
        `Error installing index template .alerts-test-template - fail`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).not.toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();
    });

    test('should throw error if checking for concrete write index throws error', async () => {
      clusterClient.indices.getAlias.mockRejectedValueOnce(new Error('fail'));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await expect(
        alertsService.initializeRegistrationContext(TestRegistrationContext)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure during installation. fail"`);

      expect(logger.error).toHaveBeenCalledWith(
        `Error fetching concrete indices for .alerts-test-* pattern - fail`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();
    });

    test('should not throw error if checking for concrete write index throws 404', async () => {
      const error = new Error(`index doesn't exist`) as HTTPError;
      error.statusCode = 404;
      clusterClient.indices.getAlias.mockRejectedValueOnce(error);
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await alertsService.initializeRegistrationContext(TestRegistrationContext);

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).toHaveBeenCalled();
    });

    test('should throw error if updating index settings for existing indices throws error', async () => {
      clusterClient.indices.putSettings.mockRejectedValueOnce(new Error('fail'));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await expect(
        alertsService.initializeRegistrationContext(TestRegistrationContext)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure during installation. fail"`);

      expect(logger.error).toHaveBeenCalledWith(
        `Failed to PUT index.mapping.total_fields.limit settings for alias alias_1: fail`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();
    });

    test('should skip updating index mapping for existing indices if simulate index template throws error', async () => {
      clusterClient.indices.simulateIndexTemplate.mockRejectedValueOnce(new Error('fail'));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await alertsService.initializeRegistrationContext(TestRegistrationContext);

      expect(logger.error).toHaveBeenCalledWith(
        `Ignored PUT mappings for alias alias_1; error generating simulated mappings: fail`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).toHaveBeenCalled();
      expect(clusterClient.indices.create).toHaveBeenCalled();
    });

    test('should throw error if updating index mappings for existing indices throws error', async () => {
      clusterClient.indices.putMapping.mockRejectedValueOnce(new Error('fail'));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await expect(
        alertsService.initializeRegistrationContext(TestRegistrationContext)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure during installation. fail"`);

      expect(logger.error).toHaveBeenCalledWith(`Failed to PUT mapping for alias alias_1: fail`);

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();
    });

    test('does not updating settings or mappings if no existing concrete indices', async () => {
      clusterClient.indices.getAlias.mockImplementationOnce(async () => ({}));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await alertsService.initializeRegistrationContext(TestRegistrationContext);

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).toHaveBeenCalled();
    });

    test('should throw error if concrete indices exist but none are write index', async () => {
      clusterClient.indices.getAlias.mockImplementationOnce(async () => ({
        '.alerts-test-0001': {
          aliases: {
            '.alerts-test': {
              is_write_index: false,
              is_hidden: true,
            },
            alias_2: {
              is_write_index: false,
              is_hidden: true,
            },
          },
        },
      }));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await expect(
        alertsService.initializeRegistrationContext(TestRegistrationContext)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure during installation. Indices matching pattern .alerts-test-* exist but none are set as the write index for alias .alerts-test"`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();
    });

    test('does not create new index if concrete write index exists', async () => {
      clusterClient.indices.getAlias.mockImplementationOnce(async () => ({
        '.alerts-test-0001': {
          aliases: {
            '.alerts-test': {
              is_write_index: true,
              is_hidden: true,
            },
            alias_2: {
              is_write_index: false,
              is_hidden: true,
            },
          },
        },
      }));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await alertsService.initializeRegistrationContext(TestRegistrationContext);

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();
    });

    test('should throw error if create concrete index throws error', async () => {
      clusterClient.indices.create.mockRejectedValueOnce(new Error('fail'));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await expect(
        alertsService.initializeRegistrationContext(TestRegistrationContext)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure during installation. fail"`);

      expect(logger.error).toHaveBeenCalledWith(`Error creating concrete write index - fail`);

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).toHaveBeenCalled();
      expect(clusterClient.indices.create).toHaveBeenCalled();
    });

    test('should not throw error if create concrete index throws resource_already_exists_exception error and write index already exists', async () => {
      const error = new Error(`fail`) as EsError;
      error.meta = {
        body: {
          error: {
            type: 'resource_already_exists_exception',
          },
        },
      };
      clusterClient.indices.create.mockRejectedValueOnce(error);
      clusterClient.indices.get.mockImplementationOnce(async () => ({
        '.alerts-test-000001': { aliases: { '.alerts-test': { is_write_index: true } } },
      }));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await alertsService.initializeRegistrationContext(TestRegistrationContext);

      expect(logger.error).toHaveBeenCalledWith(`Error creating concrete write index - fail`);

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).toHaveBeenCalled();
      expect(clusterClient.indices.get).toHaveBeenCalled();
      expect(clusterClient.indices.create).toHaveBeenCalled();
    });

    test('should throw error if create concrete index throws resource_already_exists_exception error and write index does not already exists', async () => {
      const error = new Error(`fail`) as EsError;
      error.meta = {
        body: {
          error: {
            type: 'resource_already_exists_exception',
          },
        },
      };
      clusterClient.indices.create.mockRejectedValueOnce(error);
      clusterClient.indices.get.mockImplementationOnce(async () => ({
        '.alerts-test-000001': { aliases: { '.alerts-test': { is_write_index: false } } },
      }));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await expect(
        alertsService.initializeRegistrationContext(TestRegistrationContext)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure during installation. Attempted to create index: .alerts-test-000001 as the write index for alias: .alerts-test, but the index already exists and is not the write index for the alias"`
      );

      expect(logger.error).toHaveBeenCalledWith(`Error creating concrete write index - fail`);

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).toHaveBeenCalled();
      expect(clusterClient.indices.get).toHaveBeenCalled();
      expect(clusterClient.indices.create).toHaveBeenCalled();
    });
  });

  describe('retries', () => {
    test('should retry adding ILM policy for transient ES errors', async () => {
      clusterClient.ilm.putLifecycle
        .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockResolvedValue({ acknowledged: true });
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledTimes(3);
    });

    test('should retry adding component template for transient ES errors', async () => {
      clusterClient.cluster.putComponentTemplate
        .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockResolvedValue({ acknowledged: true });
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(3);
    });

    test('should retry updating index template for transient ES errors', async () => {
      clusterClient.indices.putIndexTemplate
        .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockResolvedValue({ acknowledged: true });
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await alertsService.initializeRegistrationContext(TestRegistrationContext);
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledTimes(3);
    });

    test('should retry updating index settings for existing indices for transient ES errors', async () => {
      clusterClient.indices.putSettings
        .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockResolvedValue({ acknowledged: true });
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await alertsService.initializeRegistrationContext(TestRegistrationContext);
      expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(4);
    });

    test('should retry updating index mappings for existing indices for transient ES errors', async () => {
      clusterClient.indices.putMapping
        .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockResolvedValue({ acknowledged: true });
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await alertsService.initializeRegistrationContext(TestRegistrationContext);
      expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(4);
    });

    test('should retry creating concrete index for transient ES errors', async () => {
      clusterClient.indices.create
        .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockResolvedValue({ index: 'index', shards_acknowledged: true, acknowledged: true });
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();
      await alertsService.initializeRegistrationContext(TestRegistrationContext);
      expect(clusterClient.indices.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('timeout', () => {
    test('should short circuit initialization if timeout exceeded', async () => {
      clusterClient.ilm.putLifecycle.mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { acknowledged: true };
      });
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await expect(alertsService.initialize(10)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure during installation. Timeout: it took more than 10ms"`
      );
    });

    test('should short circuit initialization if pluginStop$ signal received but not throw error', async () => {
      pluginStop$.next();
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();

      expect(logger.error).toHaveBeenCalledWith(
        new Error(`Server is stopping; must stop all async operations`)
      );
    });
  });
});
