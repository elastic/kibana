/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { ReplaySubject, Subject } from 'rxjs';
import { AlertsService } from './alerts_service';
import { IRuleTypeAlerts } from '../types';

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
  name: '.alerts-ilm-policy',
};

interface GetIndexTemplatePutBodyOpts {
  context?: string;
  useLegacyAlerts?: boolean;
  useEcs?: boolean;
}
const getIndexTemplatePutBody = (opts?: GetIndexTemplatePutBodyOpts) => {
  const context = opts ? opts.context : undefined;
  const useLegacyAlerts = opts ? opts.useLegacyAlerts : undefined;
  const useEcs = opts ? opts.useEcs : undefined;
  return {
    name: `.alerts-${context ? context : 'test'}-default-template`,
    body: {
      index_patterns: [`.alerts-${context ? context : 'test'}-default-*`],
      composed_of: [
        `.alerts-${context ? context : 'test'}-mappings`,
        ...(useLegacyAlerts ? ['.alerts-legacy-alert-mappings'] : []),
        ...(useEcs ? ['.alerts-ecs-mappings'] : []),
        '.alerts-framework-mappings',
      ],
      template: {
        settings: {
          auto_expand_replicas: '0-1',
          hidden: true,
          'index.lifecycle': {
            name: '.alerts-ilm-policy',
            rollover_alias: `.alerts-${context ? context : 'test'}-default`,
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
};

const TestRegistrationContext: IRuleTypeAlerts = {
  context: 'test',
  fieldMap: { field: { type: 'keyword', required: false } },
};

const AnotherRegistrationContext: IRuleTypeAlerts = {
  context: 'another',
  fieldMap: { field: { type: 'keyword', required: false } },
};

describe('Alerts Service', () => {
  let pluginStop$: Subject<void>;

  beforeEach(() => {
    jest.clearAllMocks();
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

      alertsService.initialize();
      await new Promise((r) => setTimeout(r, 50));

      expect(alertsService.isInitialized()).toEqual(true);
      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledWith(IlmPutBody);
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(3);

      const componentTemplate1 = clusterClient.cluster.putComponentTemplate.mock.calls[0][0];
      expect(componentTemplate1.name).toEqual('.alerts-framework-mappings');
      const componentTemplate2 = clusterClient.cluster.putComponentTemplate.mock.calls[1][0];
      expect(componentTemplate2.name).toEqual('.alerts-legacy-alert-mappings');
      const componentTemplate3 = clusterClient.cluster.putComponentTemplate.mock.calls[2][0];
      expect(componentTemplate3.name).toEqual('.alerts-ecs-mappings');
    });

    test('should log error and set initialized to false if adding ILM policy throws error', async () => {
      clusterClient.ilm.putLifecycle.mockRejectedValueOnce(new Error('fail'));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      alertsService.initialize();
      await new Promise((r) => setTimeout(r, 50));

      expect(alertsService.isInitialized()).toEqual(false);

      expect(logger.error).toHaveBeenCalledWith(
        `Error installing ILM policy .alerts-ilm-policy - fail`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
    });

    test('should log error and set initialized to false if creating/updating common component template throws error', async () => {
      clusterClient.cluster.putComponentTemplate.mockRejectedValueOnce(new Error('fail'));
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      alertsService.initialize();
      await new Promise((r) => setTimeout(r, 50));

      expect(alertsService.isInitialized()).toEqual(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Error installing component template .alerts-framework-mappings - fail`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(1);
    });

    test('should update index template field limit and retry initialization if creating/updating common component template fails with field limit error', async () => {
      clusterClient.cluster.putComponentTemplate.mockRejectedValueOnce(
        new EsErrors.ResponseError(
          elasticsearchClientMock.createApiResponse({
            statusCode: 400,
            body: {
              error: {
                root_cause: [
                  {
                    type: 'illegal_argument_exception',
                    reason:
                      'updating component template [.alerts-ecs-mappings] results in invalid composable template [.alerts-security.alerts-default-index-template] after templates are merged',
                  },
                ],
                type: 'illegal_argument_exception',
                reason:
                  'updating component template [.alerts-ecs-mappings] results in invalid composable template [.alerts-security.alerts-default-index-template] after templates are merged',
                caused_by: {
                  type: 'illegal_argument_exception',
                  reason:
                    'composable template [.alerts-security.alerts-default-index-template] template after composition with component templates [.alerts-ecs-mappings, .alerts-security.alerts-mappings, .alerts-technical-mappings] is invalid',
                  caused_by: {
                    type: 'illegal_argument_exception',
                    reason:
                      'invalid composite mappings for [.alerts-security.alerts-default-index-template]',
                    caused_by: {
                      type: 'illegal_argument_exception',
                      reason: 'Limit of total fields [1900] has been exceeded',
                    },
                  },
                },
              },
            },
          })
        )
      );
      const existingIndexTemplate = {
        name: 'test-template',
        index_template: {
          index_patterns: ['test*'],
          composed_of: ['.alerts-framework-mappings'],
          template: {
            settings: {
              auto_expand_replicas: '0-1',
              hidden: true,
              'index.lifecycle': {
                name: '.alerts-ilm-policy',
                rollover_alias: `.alerts-empty-default`,
              },
              'index.mapping.total_fields.limit': 1800,
            },
            mappings: {
              dynamic: false,
            },
          },
        },
      };
      clusterClient.indices.getIndexTemplate.mockResolvedValueOnce({
        index_templates: [existingIndexTemplate],
      });
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      alertsService.initialize();
      await new Promise((r) => setTimeout(r, 50));

      expect(alertsService.isInitialized()).toEqual(true);
      expect(clusterClient.indices.getIndexTemplate).toHaveBeenCalledTimes(1);
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith({
        name: existingIndexTemplate.name,
        body: {
          ...existingIndexTemplate.index_template,
          template: {
            ...existingIndexTemplate.index_template.template,
            settings: {
              ...existingIndexTemplate.index_template.template?.settings,
              'index.mapping.total_fields.limit': 2500,
            },
          },
        },
      });

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      // 3x for framework, legacy-alert and ecs mappings, then 1 extra time to update component template
      // after updating index template field limit
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
    });

    test('should install resources for contexts awaiting initialization when common resources are initialized', async () => {
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      // pre-register contexts so they get installed right after initialization
      alertsService.register(TestRegistrationContext);
      alertsService.register(AnotherRegistrationContext);
      alertsService.initialize();
      await new Promise((r) => setTimeout(r, 50));

      expect(alertsService.isInitialized()).toEqual(true);
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        true
      );
      expect(await alertsService.isContextInitialized(AnotherRegistrationContext.context)).toEqual(
        true
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledWith(IlmPutBody);
      // 1x for framework component template, 1x for legacy alert, 1x for ecs, 2x for context specific
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(5);

      const componentTemplate1 = clusterClient.cluster.putComponentTemplate.mock.calls[0][0];
      expect(componentTemplate1.name).toEqual('.alerts-framework-mappings');
      const componentTemplate2 = clusterClient.cluster.putComponentTemplate.mock.calls[1][0];
      expect(componentTemplate2.name).toEqual('.alerts-legacy-alert-mappings');
      const componentTemplate3 = clusterClient.cluster.putComponentTemplate.mock.calls[2][0];
      expect(componentTemplate3.name).toEqual('.alerts-ecs-mappings');
      const componentTemplate4 = clusterClient.cluster.putComponentTemplate.mock.calls[3][0];
      expect(componentTemplate4.name).toEqual('.alerts-another-mappings');
      const componentTemplate5 = clusterClient.cluster.putComponentTemplate.mock.calls[4][0];
      expect(componentTemplate5.name).toEqual('.alerts-test-mappings');

      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
        1,
        getIndexTemplatePutBody({ context: 'another' })
      );
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
        2,
        getIndexTemplatePutBody()
      );

      expect(clusterClient.indices.getAlias).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.getAlias).toHaveBeenNthCalledWith(1, {
        index: '.alerts-another-default-*',
      });
      expect(clusterClient.indices.getAlias).toHaveBeenNthCalledWith(2, {
        index: '.alerts-test-default-*',
      });
      expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(4);
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(4);
      expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(4);
      expect(clusterClient.indices.create).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.create).toHaveBeenNthCalledWith(1, {
        index: '.alerts-another-default-000001',
        body: {
          aliases: {
            '.alerts-another-default': {
              is_write_index: true,
            },
          },
        },
      });
      expect(clusterClient.indices.create).toHaveBeenNthCalledWith(2, {
        index: '.alerts-test-default-000001',
        body: {
          aliases: {
            '.alerts-test-default': {
              is_write_index: true,
            },
          },
        },
      });
    });
  });

  describe('register()', () => {
    let alertsService: AlertsService;
    beforeEach(async () => {
      alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      alertsService.initialize();
      await new Promise((r) => setTimeout(r, 50));
      expect(alertsService.isInitialized()).toEqual(true);
    });

    test('should correctly install resources for context when common initialization is complete', async () => {
      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        true
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledWith(IlmPutBody);

      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
      const componentTemplate1 = clusterClient.cluster.putComponentTemplate.mock.calls[0][0];
      expect(componentTemplate1.name).toEqual('.alerts-framework-mappings');
      const componentTemplate2 = clusterClient.cluster.putComponentTemplate.mock.calls[1][0];
      expect(componentTemplate2.name).toEqual('.alerts-legacy-alert-mappings');
      const componentTemplate3 = clusterClient.cluster.putComponentTemplate.mock.calls[2][0];
      expect(componentTemplate3.name).toEqual('.alerts-ecs-mappings');
      const componentTemplate4 = clusterClient.cluster.putComponentTemplate.mock.calls[3][0];
      expect(componentTemplate4.name).toEqual('.alerts-test-mappings');

      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        getIndexTemplatePutBody()
      );
      expect(clusterClient.indices.getAlias).toHaveBeenCalledWith({
        index: '.alerts-test-default-*',
      });
      expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.create).toHaveBeenCalledWith({
        index: '.alerts-test-default-000001',
        body: {
          aliases: {
            '.alerts-test-default': {
              is_write_index: true,
            },
          },
        },
      });
    });

    test('should correctly install resources for context when useLegacyAlerts is true', async () => {
      alertsService.register({ ...TestRegistrationContext, useLegacyAlerts: true });
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        true
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledWith(IlmPutBody);

      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
      const componentTemplate1 = clusterClient.cluster.putComponentTemplate.mock.calls[0][0];
      expect(componentTemplate1.name).toEqual('.alerts-framework-mappings');
      const componentTemplate2 = clusterClient.cluster.putComponentTemplate.mock.calls[1][0];
      expect(componentTemplate2.name).toEqual('.alerts-legacy-alert-mappings');
      const componentTemplate3 = clusterClient.cluster.putComponentTemplate.mock.calls[2][0];
      expect(componentTemplate3.name).toEqual('.alerts-ecs-mappings');
      const componentTemplate4 = clusterClient.cluster.putComponentTemplate.mock.calls[3][0];
      expect(componentTemplate4.name).toEqual('.alerts-test-mappings');

      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        getIndexTemplatePutBody({ useLegacyAlerts: true })
      );
      expect(clusterClient.indices.getAlias).toHaveBeenCalledWith({
        index: '.alerts-test-default-*',
      });
      expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.create).toHaveBeenCalledWith({
        index: '.alerts-test-default-000001',
        body: {
          aliases: {
            '.alerts-test-default': {
              is_write_index: true,
            },
          },
        },
      });
    });

    test('should correctly install resources for context when useEcs is true', async () => {
      alertsService.register({ ...TestRegistrationContext, useEcs: true });
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        true
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledWith(IlmPutBody);

      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
      const componentTemplate1 = clusterClient.cluster.putComponentTemplate.mock.calls[0][0];
      expect(componentTemplate1.name).toEqual('.alerts-framework-mappings');
      const componentTemplate2 = clusterClient.cluster.putComponentTemplate.mock.calls[1][0];
      expect(componentTemplate2.name).toEqual('.alerts-legacy-alert-mappings');
      const componentTemplate3 = clusterClient.cluster.putComponentTemplate.mock.calls[2][0];
      expect(componentTemplate3.name).toEqual('.alerts-ecs-mappings');
      const componentTemplate4 = clusterClient.cluster.putComponentTemplate.mock.calls[3][0];
      expect(componentTemplate4.name).toEqual('.alerts-test-mappings');

      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        getIndexTemplatePutBody({ useEcs: true })
      );
      expect(clusterClient.indices.getAlias).toHaveBeenCalledWith({
        index: '.alerts-test-default-*',
      });
      expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.create).toHaveBeenCalledWith({
        index: '.alerts-test-default-000001',
        body: {
          aliases: {
            '.alerts-test-default': {
              is_write_index: true,
            },
          },
        },
      });
    });

    test('should not install component template for context if fieldMap is empty', async () => {
      alertsService.register({
        context: 'empty',
        fieldMap: {},
      });
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized('empty')).toEqual(true);

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledWith(IlmPutBody);

      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(3);
      const componentTemplate1 = clusterClient.cluster.putComponentTemplate.mock.calls[0][0];
      expect(componentTemplate1.name).toEqual('.alerts-framework-mappings');
      const componentTemplate2 = clusterClient.cluster.putComponentTemplate.mock.calls[1][0];
      expect(componentTemplate2.name).toEqual('.alerts-legacy-alert-mappings');
      const componentTemplate3 = clusterClient.cluster.putComponentTemplate.mock.calls[2][0];
      expect(componentTemplate3.name).toEqual('.alerts-ecs-mappings');

      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith({
        name: `.alerts-empty-default-template`,
        body: {
          index_patterns: [`.alerts-empty-default-*`],
          composed_of: ['.alerts-framework-mappings'],
          template: {
            settings: {
              auto_expand_replicas: '0-1',
              hidden: true,
              'index.lifecycle': {
                name: '.alerts-ilm-policy',
                rollover_alias: `.alerts-empty-default`,
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
      });
      expect(clusterClient.indices.getAlias).toHaveBeenCalledWith({
        index: '.alerts-empty-default-*',
      });
      expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(2);
      expect(clusterClient.indices.create).toHaveBeenCalledWith({
        index: '.alerts-empty-default-000001',
        body: {
          aliases: {
            '.alerts-empty-default': {
              is_write_index: true,
            },
          },
        },
      });
    });

    test('should skip initialization if context already exists', async () => {
      alertsService.register(TestRegistrationContext);
      alertsService.register(TestRegistrationContext);

      expect(logger.debug).toHaveBeenCalledWith(
        `Resources for context "test" have already been registered.`
      );
    });

    test('should throw error if context already exists and has been registered with a different field map', async () => {
      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(() => {
        alertsService.register({
          ...TestRegistrationContext,
          fieldMap: { anotherField: { type: 'keyword', required: false } },
        });
      }).toThrowErrorMatchingInlineSnapshot(
        `"test has already been registered with a different mapping"`
      );
    });

    test('should not update index template if simulating template throws error', async () => {
      clusterClient.indices.simulateTemplate.mockRejectedValueOnce(new Error('fail'));

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        true
      );

      expect(logger.error).toHaveBeenCalledWith(
        `Failed to simulate index template mappings for .alerts-test-default-template; not applying mappings - fail`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      // putIndexTemplate is skipped but other operations are called as expected
      expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).toHaveBeenCalled();
      expect(clusterClient.indices.create).toHaveBeenCalled();
    });

    test('should log error and set initialized to false if simulating template returns empty mappings', async () => {
      clusterClient.indices.simulateTemplate.mockImplementationOnce(async () => ({
        ...SimulateTemplateResponse,
        template: {
          ...SimulateTemplateResponse.template,
          mappings: {},
        },
      }));

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        false
      );

      expect(logger.error).toHaveBeenCalledWith(
        new Error(
          `No mappings would be generated for .alerts-test-default-template, possibly due to failed/misconfigured bootstrapping`
        )
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).not.toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();
    });

    test('should log error and set initialized to false if updating index template throws error', async () => {
      clusterClient.indices.putIndexTemplate.mockRejectedValueOnce(new Error('fail'));

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        false
      );

      expect(logger.error).toHaveBeenCalledWith(
        `Error installing index template .alerts-test-default-template - fail`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).not.toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();
    });

    test('should log error and set initialized to false if checking for concrete write index throws error', async () => {
      clusterClient.indices.getAlias.mockRejectedValueOnce(new Error('fail'));

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        false
      );

      expect(logger.error).toHaveBeenCalledWith(
        `Error fetching concrete indices for .alerts-test-default-* pattern - fail`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
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

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        true
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).toHaveBeenCalled();
    });

    test('should log error and set initialized to false if updating index settings for existing indices throws error', async () => {
      clusterClient.indices.putSettings.mockRejectedValueOnce(new Error('fail'));

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        false
      );

      expect(logger.error).toHaveBeenCalledWith(
        `Failed to PUT index.mapping.total_fields.limit settings for alias alias_1: fail`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
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

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        true
      );

      expect(logger.error).toHaveBeenCalledWith(
        `Ignored PUT mappings for alias alias_1; error generating simulated mappings: fail`
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).toHaveBeenCalled();
      expect(clusterClient.indices.create).toHaveBeenCalled();
    });

    test('should log error and set initialized to false if updating index mappings for existing indices throws error', async () => {
      clusterClient.indices.putMapping.mockRejectedValueOnce(new Error('fail'));

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        false
      );

      expect(logger.error).toHaveBeenCalledWith(`Failed to PUT mapping for alias alias_1: fail`);

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
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

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        true
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).toHaveBeenCalled();
    });

    test('should log error and set initialized to false if concrete indices exist but none are write index', async () => {
      clusterClient.indices.getAlias.mockImplementationOnce(async () => ({
        '.alerts-test-default-0001': {
          aliases: {
            '.alerts-test-default': {
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

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        false
      );

      expect(logger.error).toHaveBeenCalledWith(
        new Error(
          `Indices matching pattern .alerts-test-default-* exist but none are set as the write index for alias .alerts-test-default`
        )
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
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
        '.alerts-test-default-0001': {
          aliases: {
            '.alerts-test-default': {
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

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        true
      );

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();
    });

    test('should log error and set initialized to false if create concrete index throws error', async () => {
      clusterClient.indices.create.mockRejectedValueOnce(new Error('fail'));

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        false
      );

      expect(logger.error).toHaveBeenCalledWith(`Error creating concrete write index - fail`);

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
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
        '.alerts-test-default-000001': {
          aliases: { '.alerts-test-default': { is_write_index: true } },
        },
      }));

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        true
      );

      expect(logger.error).toHaveBeenCalledWith(`Error creating concrete write index - fail`);

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
      expect(clusterClient.indices.simulateTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();
      expect(clusterClient.indices.simulateIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putMapping).toHaveBeenCalled();
      expect(clusterClient.indices.get).toHaveBeenCalled();
      expect(clusterClient.indices.create).toHaveBeenCalled();
    });

    test('should log error and set initialized to false if create concrete index throws resource_already_exists_exception error and write index does not already exists', async () => {
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
        '.alerts-test-default-000001': {
          aliases: { '.alerts-test-default': { is_write_index: false } },
        },
      }));

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 50));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        false
      );

      expect(logger.error).toHaveBeenCalledWith(`Error creating concrete write index - fail`);

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
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

      alertsService.initialize();
      await new Promise((r) => setTimeout(r, 150));
      expect(alertsService.isInitialized()).toEqual(true);
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

      alertsService.initialize();
      await new Promise((r) => setTimeout(r, 150));
      expect(alertsService.isInitialized()).toEqual(true);
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(5);
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

      alertsService.initialize();
      await new Promise((r) => setTimeout(r, 150));
      expect(alertsService.isInitialized()).toEqual(true);

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 150));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        true
      );
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

      alertsService.initialize();
      await new Promise((r) => setTimeout(r, 150));
      expect(alertsService.isInitialized()).toEqual(true);

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 150));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        true
      );
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

      alertsService.initialize();
      await new Promise((r) => setTimeout(r, 150));
      expect(alertsService.isInitialized()).toEqual(true);

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 150));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        true
      );
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

      alertsService.initialize();
      await new Promise((r) => setTimeout(r, 150));
      expect(alertsService.isInitialized()).toEqual(true);

      alertsService.register(TestRegistrationContext);
      await new Promise((r) => setTimeout(r, 150));
      expect(await alertsService.isContextInitialized(TestRegistrationContext.context)).toEqual(
        true
      );
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

      alertsService.initialize(10);
      await new Promise((r) => setTimeout(r, 150));
      expect(alertsService.isInitialized()).toEqual(false);

      expect(logger.error).toHaveBeenCalledWith(new Error(`Timeout: it took more than 10ms`));
    });

    test('should short circuit initialization if pluginStop$ signal received but not throw error', async () => {
      pluginStop$.next();
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      alertsService.initialize();
      await new Promise((r) => setTimeout(r, 50));

      expect(logger.error).toHaveBeenCalledWith(
        new Error(`Server is stopping; must stop all async operations`)
      );
    });
  });
});
