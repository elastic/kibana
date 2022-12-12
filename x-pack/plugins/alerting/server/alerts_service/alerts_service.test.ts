/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ReplaySubject, Subject } from 'rxjs';
import { AlertsService } from './alerts_service';

const logger = loggingSystemMock.create().get();
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

      alertsService.initialize();

      // wait until the ILM policy call is made, all subsequent calls should come right after
      await retryUntil('es client ILM putLifecycle called', () => {
        return clusterClient.ilm.putLifecycle.mock.calls.length !== 0;
      });

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledWith(IlmPutBody);
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);

      const componentTemplate1 = clusterClient.cluster.putComponentTemplate.mock.calls[0][0];
      expect(componentTemplate1.name).toEqual('alerts-default-component-template');
      const componentTemplate2 = clusterClient.cluster.putComponentTemplate.mock.calls[1][0];
      expect(componentTemplate2.name).toEqual('alerts-ecs-component-template');

      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith(IndexTemplatePutBody);
      expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(2);
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
      clusterClient.ilm.putLifecycle.mockImplementation(() => {
        throw new Error('fail');
      });
      const alertsService = new AlertsService({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        pluginStop$,
      });

      expect(alertsService.initialize()).toThrowErrorMatchingInlineSnapshot(``);

      // wait until the ILM policy call is made, all subsequent calls should come right after
      await retryUntil('es client ILM putLifecycle called', () => {
        return clusterClient.ilm.putLifecycle.mock.calls.length !== 0;
      });

      expect(clusterClient.ilm.putLifecycle).toHaveBeenCalledWith(IlmPutBody);
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);

      const componentTemplate1 = clusterClient.cluster.putComponentTemplate.mock.calls[0][0];
      expect(componentTemplate1.name).toEqual('alerts-default-component-template');
      const componentTemplate2 = clusterClient.cluster.putComponentTemplate.mock.calls[1][0];
      expect(componentTemplate2.name).toEqual('alerts-ecs-component-template');

      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith(IndexTemplatePutBody);
      expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(2);
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
  });
});

async function retryUntil(
  label: string,
  fn: () => boolean,
  count: number = 20,
  wait: number = 1000
): Promise<boolean> {
  while (count > 0) {
    count--;

    if (fn()) return true;

    // eslint-disable-next-line no-console
    console.log(`attempt failed waiting for "${label}", attempts left: ${count}`);

    if (count === 0) return false;
    await new Promise((resolve) => setTimeout(resolve, wait));
  }

  return false;
}
