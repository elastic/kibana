/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreKibanaRequest, FakeRawRequest } from '@kbn/core/server';
import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';

import { AlertingPlugin, PluginStartContract as AlertingStart } from '../plugin';
import { IRuleTypeAlerts } from '..';
import { setupTestServers, retry } from './lib';
import { RawAlertInstance, RulesClientApi } from '../types';

const AlertingStartSpy = jest.spyOn(AlertingPlugin.prototype, 'start');

jest.mock('../rule_type_registry', () => {
  const actual = jest.requireActual('../rule_type_registry');
  return {
    ...actual,
    RuleTypeRegistry: jest.fn().mockImplementation((opts) => {
      return new actual.RuleTypeRegistry(opts);
    }),
  };
});

jest.mock('../lib/determine_alerts_to_return', () => {
  const actual = jest.requireActual('../lib/determine_alerts_to_return');
  return {
    ...actual,
    determineAlertsToReturn: jest.fn().mockImplementation((...args) => {
      const result = new actual.determineAlertsToReturn(...args);
      return determineAlertsToReturnAdapter(result);
    }),
  };

  function determineAlertsToReturnAdapter<X, Y, Z, A>({
    alertsToReturn,
    recoveredAlertsToReturn,
  }: {
    alertsToReturn: Record<string, RawAlertInstance>;
    recoveredAlertsToReturn: Record<string, RawAlertInstance>;
  }): {
    alertsToReturn: Record<string, RawAlertInstance>;
    recoveredAlertsToReturn: Record<string, RawAlertInstance>;
  } {
    // creates copies of alerts, same uuid, but the id is different
    for (const id of Object.keys(alertsToReturn)) {
      alertsToReturn[`${id}-conflicted`] = alertsToReturn[id];
    }
    return { alertsToReturn, recoveredAlertsToReturn };
  }
});

describe('Handle conflicts when writing alert docs', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let alertingStart: AlertingStart;
  let rulesClient: RulesClientApi;

  beforeAll(async () => {
    const setupResult = await setupTestServers({
      xpack: {
        alerting: {
          rules: {
            minimumScheduleInterval: {
              value: '1s',
            },
          },
        },
      },
    });
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    expect(AlertingStartSpy).toHaveBeenCalledTimes(1);
    alertingStart = AlertingStartSpy.mock.results[0].value;

    await wait(5000);

    rulesClient = alertingStart.getRulesClientWithRequest(getFakeRequest());
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  test('handle conflict when creating alert', async () => {
    console.log(`Creating rule...`);
    const rule = await createRule(rulesClient);

    retry(async () => {
      const currRule = await rulesClient.get({ id: rule.id });
      expect(currRule.monitoring?.run.last_run.timestamp).not.toBeFalsy();
    });
    console.log(`Created rule: ${JSON.stringify(rule.id, null, 4)}`);
  });
});

async function createRule(rulesClient: RulesClientApi) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await rulesClient.create<any>({
    data: {
      alertTypeId: '.es-query',
      name: 'eq',
      enabled: true,
      tags: [],
      actions: [],
      consumer: 'alerts',
      schedule: { interval: '1s' },
      params: {
        timeField: '@timestamp',
        index: ['.kibana-event-log-*'],
        esQuery: '{\n    "query":{\n      "match_all" : {}\n    }\n  }',
        size: 100,
        thresholdComparator: '>',
        timeWindowSize: 1,
        timeWindowUnit: 's',
        threshold: [1000],
        aggType: 'count',
        groupBy: 'top',
        termSize: 5,
        searchType: 'esQuery',
        excludeHitsFromPreviousRun: false,
        sourceFields: [],
        termField: 'event.action',
      },
    },
  });
}

async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFakeRequest(): CoreKibanaRequest {
  const auth = Buffer.from(`elastic:changeme`).toString('base64');
  const headers = {
    authorization: `Basic ${auth}`,
  };

  const fakeRawRequest: FakeRawRequest = {
    headers,
    path: '/',
  };

  return CoreKibanaRequest.from(fakeRawRequest);
}

export const STACK_ALERTS_AAD_CONFIG: IRuleTypeAlerts<{}> = {
  context: 'jest',
  mappings: {
    fieldMap: {},
  },
  shouldWrite: true,
  useEcs: true,
};

export const RULE_TYPE_ID = '...conflicting-alert-docs';
export const ACTION_GROUP_ID = 'default';
