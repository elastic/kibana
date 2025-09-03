/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export const indexThresholdRuleName = 'kibana sites - low bytes';
export const esQueryRuleName = 'sample logs query rule';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const browser = getService('browser');
  const actions = getService('actions');
  const rules = getService('rules');
  const emailConnectorName = 'Email connector 1';
  const validQueryJson = JSON.stringify({
    query: {
      bool: {
        filter: [
          {
            term: {
              'host.keyword': 'www.elastic.co',
            },
          },
        ],
      },
    },
  });

  describe('stack alerting', function () {
    let itRuleId: string;
    let esRuleId: string;
    let serverLogConnectorId: string;
    let emailConnectorId: string;
    before(async () => {
      // Create server log connector
      await browser.setWindowSize(1920, 1080);
      ({ id: serverLogConnectorId } = await actions.api.createConnector({
        name: 'my-server-log-connector',
        config: {},
        secrets: {},
        connectorTypeId: '.server-log',
      }));
      // Create email connector
      ({ id: emailConnectorId } = await actions.api.createConnector({
        name: emailConnectorName,
        config: {
          service: 'other',
          from: 'bob@example.com',
          host: 'some.non.existent.com',
          port: 25,
        },
        secrets: {
          user: 'bob',
          password: 'supersecret',
        },
        connectorTypeId: '.email',
      }));
      // Create index threshold rule
      ({ id: itRuleId } = await rules.api.createRule({
        consumer: 'alerts',
        name: indexThresholdRuleName,
        notifyWhen: 'onActionGroupChange',
        params: {
          index: ['kibana_sample_data_logs'],
          timeField: '@timestamp',
          aggType: 'sum',
          aggField: 'bytes',
          groupBy: 'top',
          termField: 'host.keyword',
          termSize: 4,
          timeWindowSize: 24,
          timeWindowUnit: 'h',
          thresholdComparator: '>',
          threshold: [4200],
        },
        ruleTypeId: '.index-threshold',
        schedule: { interval: '1m' },
        actions: [
          {
            group: 'threshold met',
            id: serverLogConnectorId,
            params: {
              level: 'info',
              message: 'Test',
            },
          },
        ],
      }));
      // Create Elasticsearch query rule
      ({ id: esRuleId } = await rules.api.createRule({
        consumer: 'alerts',
        name: esQueryRuleName,
        params: {
          index: ['kibana_sample_data_logs'],
          timeField: '@timestamp',
          timeWindowSize: 1,
          timeWindowUnit: 'd',
          thresholdComparator: '>',
          threshold: [100],
          size: 100,
          esQuery: validQueryJson,
        },
        ruleTypeId: '.es-query',
        schedule: { interval: '1d' },
        actions: [
          {
            group: 'query matched',
            id: emailConnectorId,
            frequency: {
              throttle: '2d',
              summary: true,
              notify_when: 'onThrottleInterval',
            },
            params: {
              to: ['test@example.com'],
              subject: 'Alert summary',
              message:
                'The system has detected {{alerts.new.count}} new, {{alerts.ongoing.count}} ongoing, and {{alerts.recovered.count}} recovered alerts.',
            },
          },
          {
            group: 'recovered',
            id: serverLogConnectorId,
            frequency: {
              summary: false,
              notify_when: 'onActionGroupChange',
            },
            params: {
              level: 'info',
              message: '{{alert.id}} has recovered.',
            },
          },
        ],
      }));
    });

    after(async () => {
      await rules.api.deleteRule(itRuleId);
      await rules.api.deleteRule(esRuleId);
      await rules.api.deleteAllRules();
      await actions.api.deleteConnector(serverLogConnectorId);
      await actions.api.deleteAllConnectors();
    });

    loadTestFile(require.resolve('./es_query_rule'));
    loadTestFile(require.resolve('./index_threshold_rule'));
    loadTestFile(require.resolve('./list_view'));
    loadTestFile(require.resolve('./tracking_containment_rule'));
  });
}
