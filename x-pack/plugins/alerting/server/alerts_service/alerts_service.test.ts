/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
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
  name: '.alerts-default-template',
  body: {
    index_patterns: ['.alerts-default-*'],
    composed_of: ['alerts-default-component-template', 'alerts-ecs-component-template'],
    template: {
      settings: {
        auto_expand_replicas: '0-1',
        hidden: true,
        'index.lifecycle': {
          name: 'alerts-default-ilm-policy',
          rollover_alias: '.alerts-default',
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

describe('Alerts Service', () => {
  let pluginStop$: Subject<void>;

  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggingSystemMock.createLogger();
    pluginStop$ = new ReplaySubject(1);

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
    test('should correctly initialize all resources', async () => {
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledWith(IlmPutBody);
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);

      const componentTemplate1 = clusterClient.cluster.putComponentTemplate.mock.calls[0][0];
      expect(componentTemplate1.name).toEqual('alerts-default-component-template');
      const componentTemplate2 = clusterClient.cluster.putComponentTemplate.mock.calls[1][0];
      expect(componentTemplate2.name).toEqual('alerts-ecs-component-template');

      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith(IndexTemplatePutBody);
      expect(clusterClient.indices.getAlias).toHaveBeenCalledWith({ index: '.alerts-default-*' });
      expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.create).toHaveBeenCalledWith({
        index: '.alerts-default-000001',
        body: {
          aliases: {
            '.alerts-default': {
              is_write_index: true,
            },
          },
        },
      });
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
      expect(clusterClient.indices.simulateTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).not.toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();
    });

    test('should throw error if updating component template throws error', async () => {
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
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).not.toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();
    });

    test('should not update index template if simulating template throws error', async () => {
      clusterClient.indices.simulateTemplate.mockRejectedValueOnce(new Error('fail'));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();

      expect(logger.error).toHaveBeenCalledWith(
        `Failed to simulate index template mappings for .alerts-default-template; not applying mappings - fail`
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

      await expect(alertsService.initialize()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure during installation. No mappings would be generated for .alerts-default-template, possibly due to failed/misconfigured bootstrapping"`
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

      await expect(alertsService.initialize()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure during installation. fail"`
      );

      expect(logger.error).toHaveBeenCalledWith(
        `Error installing index template .alerts-default-template - fail`
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

      await expect(alertsService.initialize()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure during installation. fail"`
      );

      expect(logger.error).toHaveBeenCalledWith(
        `Error fetching concrete indices for .alerts-default-* pattern - fail`
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

      await expect(alertsService.initialize()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure during installation. fail"`
      );

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

      await expect(alertsService.initialize()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure during installation. fail"`
      );

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
        '.alerts-default-0001': {
          aliases: {
            '.alerts-default': {
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

      await expect(alertsService.initialize()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure during installation. Indices matching pattern .alerts-default-* exist but none are set as the write index for alias .alerts-default"`
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
        '.alerts-default-0001': {
          aliases: {
            '.alerts-default': {
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

      await expect(alertsService.initialize()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure during installation. fail"`
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
        '.alerts-default-000001': { aliases: { '.alerts-default': { is_write_index: true } } },
      }));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await alertsService.initialize();

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
        '.alerts-default-000001': { aliases: { '.alerts-default': { is_write_index: false } } },
      }));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      await expect(alertsService.initialize()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure during installation. Attempted to create index: .alerts-default-000001 as the write index for alias: .alerts-default, but the index already exists and is not the write index for the alias"`
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
});
