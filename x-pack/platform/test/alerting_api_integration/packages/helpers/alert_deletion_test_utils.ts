/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import moment from 'moment';

// active lifecycle alert
// status = 'active', no kibana.alert.end field

// inactive lifecycle alert
// status = 'untracked' or 'recovered', exists kibana.alert.end field
// alerts can be directly untracked or will be untracked when deleted

// active security alert
// status = 'active', no kibana.alert.end field

// acknowledged security alert
// status = 'active'
// kibana.alert.workflow_status = 'acknowledged', kibana.alert.workflow_status_updated_at exists

// closed security alert
// status = 'active'
// kibana.alert.workflow_status = 'closed', kibana.alert.workflow_status_updated_at exists

const getRandomBoolean = () => (Math.floor(Math.random() * 2) === 0 ? false : true);

const getFieldsFromType = (type: string, spaceId: string) => {
  if (type === 'stack') {
    return {
      index: '.internal.alerts-stack.alerts-default-000001',
      ruleCategory: 'Elasticsearch query',
      ruleConsumer: 'stackAlerts',
      ruleType: '.es-query',
    };
  } else if (type === 'o11y') {
    return {
      index: '.internal.alerts-observability.threshold.alerts-default-000001',
      ruleCategory: 'Custom threshold',
      ruleConsumer: 'logs',
      ruleType: 'observability.rules.custom_threshold',
    };
  } else if (type === 'security') {
    return {
      index: `.internal.alerts-security.alerts-${spaceId}-000001`,
      ruleCategory: 'Custom Query Rule',
      ruleConsumer: 'siem',
      ruleType: 'siem.queryRule',
    };
  }
  throw new Error(`Invalid type ${type}`);
};

export const getRecoveredAlert = (
  id: string,
  type: string,
  recoveredTime: string,
  spaceId: string = 'default',
  isUntracked: boolean = false
) => {
  const fields = getFieldsFromType(type, spaceId);
  const startTime = moment(recoveredTime).subtract(10, 'hours').toISOString();

  return {
    _index: fields.index,
    _id: id,
    _score: 1,
    _source: {
      '@timestamp': recoveredTime,
      'kibana.alert.rule.execution.timestamp': recoveredTime,
      'kibana.alert.time_range': {
        gte: startTime,
        lte: recoveredTime,
      },
      'kibana.alert.start': startTime,
      'kibana.alert.end': recoveredTime,
      'event.action': isUntracked ? 'active' : 'close',
      'kibana.alert.status': isUntracked ? 'untracked' : 'recovered',
      'kibana.alert.url':
        '/app/management/insightsAndAlerting/triggersActions/rule/854ebba1-c0c1-4ac1-88c0-72442d1137b2',
      'kibana.alert.reason':
        'Document count is 0 in the last 5d in .kibana-event-log* index. Alert when less than 0.',
      'kibana.alert.title':
        "rule 'Elasticsearch query rule - stack rules visibility - recovered alert' recovered",
      'kibana.alert.evaluation.conditions': 'Number of matching documents is NOT less than 0',
      'kibana.alert.evaluation.value': '0',
      'kibana.alert.evaluation.threshold': 0,
      'kibana.alert.rule.category': fields.ruleCategory,
      'kibana.alert.rule.consumer': fields.ruleConsumer,
      'kibana.alert.rule.rule_type_id': fields.ruleType,
      'kibana.alert.rule.execution.uuid': 'c297ed97-6f2a-4489-9ce1-e0e369857fc1',
      'kibana.alert.rule.name': 'rule',
      'kibana.alert.rule.parameters': {},
      'kibana.alert.rule.producer': 'stackAlerts',
      'kibana.alert.rule.revision': 0,
      'kibana.alert.rule.tags': [],
      'kibana.alert.rule.uuid': '854ebba1-c0c1-4ac1-88c0-72442d1137b2',
      'kibana.space_ids': [spaceId],
      'event.kind': 'signal',
      'kibana.alert.action_group': 'recovered',
      'kibana.alert.flapping': false,
      'kibana.alert.flapping_history': [true, false, true, false],
      'kibana.alert.instance.id': 'query matched',
      'kibana.alert.maintenance_window_ids': [],
      'kibana.alert.consecutive_matches': 0,
      'kibana.alert.pending_recovered_count': 0,
      'kibana.alert.uuid': 'dfc28b3a-cd8f-40bb-a002-2da894565fff',
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.duration.us': 120021000,
      'kibana.version': '9.1.0',
      tags: [],
      'kibana.alert.previous_action_group': 'recovered',
    },
  };
};

const getAcknowledgedOrClosedDetectionAlert = (
  id: string,
  type: string,
  closedTime: string,
  spaceId: string = 'default',
  isClosed: boolean = false
) => {
  const fields = getFieldsFromType(type, spaceId);
  const startTime = moment(closedTime).subtract(10, 'hours').toISOString();

  return {
    _index: fields.index,
    _id: id,
    _score: 1,
    _source: {
      'kibana.alert.severity': 'low',
      'kibana.alert.workflow_status': isClosed ? 'closed' : 'acknowledged',
      'kibana.alert.start': startTime,
      'kibana.alert.workflow_status_updated_at': closedTime,
      'kibana.alert.rule.references': [],
      'kibana.alert.rule.updated_by': 'elastic',
      'kibana.alert.rule.threat': [],
      'kibana.alert.rule.description': 'test',
      'kibana.alert.rule.tags': [],
      'kibana.alert.rule.producer': 'siem',
      'kibana.alert.rule.to': 'now',
      'kibana.alert.rule.created_by': 'elastic',
      ecs: {
        version: '1.8.0',
      },
      'kibana.alert.risk_score': 21,
      'kibana.alert.rule.name': 'test',
      'event.kind': 'signal',
      'kibana.alert.rule.uuid': 'e3826f22-49f5-48c7-b7fc-129b53dadde3',
      'kibana.alert.original_event.category': ['stackAlerts'],
      'kibana.alert.rule.risk_score_mapping': [],
      'kibana.alert.rule.interval': '5m',
      'kibana.alert.reason': 'stackAlerts event created low alert test.',
      'kibana.alert.rule.type': 'query',
      'kibana.alert.workflow_user': 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
      'kibana.alert.original_event.end': '2025-03-13T18:04:27.652Z',
      'kibana.alert.rule.immutable': false,
      'kibana.alert.depth': 1,
      'kibana.alert.rule.enabled': true,
      'kibana.alert.rule.version': 1,
      'kibana.alert.rule.from': 'now-6m',
      'kibana.alert.rule.parameters': {},
      'kibana.alert.rule.revision': 0,
      'kibana.alert.status': 'active',
      'kibana.alert.last_detected': '2025-03-13T18:04:42.345Z',
      'kibana.alert.ancestors': [
        {
          depth: 0,
          index: '.ds-.kibana-event-log-ds-2025.03.13-000001',
          id: 'rVWtkJUBaS1Zhvnn3ae9',
          type: 'event',
        },
      ],
      rule: {
        license: 'basic',
        ruleset: 'stackAlerts',
        name: 'Elasticsearch query rule - stack rules visibility - recovered alert',
        id: '854ebba1-c0c1-4ac1-88c0-72442d1137b2',
        category: '.es-query',
      },
      'kibana.alert.original_event.start': '2025-03-13T18:04:27.219Z',
      'kibana.alert.rule.exceptions_list': [],
      'kibana.alert.rule.actions': [],
      'kibana.alert.original_event.duration': '433000000',
      'kibana.alert.rule.rule_type_id': fields.ruleType,
      'kibana.alert.original_event.provider': 'alerting',
      'kibana.alert.rule.license': '',
      event: {
        duration: '433000000',
        provider: 'alerting',
        start: '2025-03-13T18:04:27.219Z',
        action: 'execute',
        end: '2025-03-13T18:04:27.652Z',
        category: ['stackAlerts'],
        outcome: 'success',
      },
      'kibana.alert.original_event.kind': 'alert',
      'kibana.alert.workflow_tags': [],
      'kibana.alert.workflow_assignee_ids': [],
      'kibana.alert.rule.severity_mapping': [],
      'kibana.alert.rule.max_signals': 100,
      'kibana.alert.rule.updated_at': '2025-03-13T18:04:38.248Z',
      'kibana.alert.rule.risk_score': 21,
      'kibana.alert.rule.author': [],
      'kibana.alert.rule.false_positives': [],
      message:
        "rule executed: .es-query:854ebba1-c0c1-4ac1-88c0-72442d1137b2: 'Elasticsearch query rule - stack rules visibility - recovered alert'",
      'kibana.alert.rule.consumer': fields.ruleConsumer,
      'kibana.alert.rule.indices': ['.kibana-event-log*'],
      'kibana.alert.rule.category': fields.ruleCategory,
      'kibana.alert.original_event.outcome': 'success',
      '@timestamp': '2025-03-13T18:04:42.336Z',
      'kibana.alert.original_event.action': 'execute',
      'kibana.alert.rule.created_at': '2025-03-13T18:04:38.248Z',
      'kibana.alert.rule.severity': 'low',
      'kibana.alert.intended_timestamp': '2025-03-13T18:04:42.336Z',
      'kibana.alert.rule.execution.timestamp': '2025-03-13T18:04:42.345Z',
      'kibana.alert.rule.execution.uuid': 'e8fd0690-5df6-443b-a239-2201b892b9cf',
      'kibana.space_ids': [spaceId],
      'kibana.alert.uuid': '257dd79a64d37887286d2ce025f5109f354071767b85801c7b24b89118928d08',
      'kibana.alert.rule.meta.kibana_siem_app_url': 'https://localhost:5601/app/security',
      'kibana.version': '9.1.0',
      'kibana.alert.rule.execution.type': 'scheduled',
      'kibana.alert.original_time': '2025-03-13T18:04:27.652Z',
      'kibana.alert.rule.rule_id': 'd4066053-6434-49f5-928f-73cf56097b52',
    },
  };
};

export const getActiveAlert = (
  id: string,
  type: string,
  activeTime: string,
  spaceId: string = 'default'
) => {
  const fields = getFieldsFromType(type, spaceId);
  return {
    _index: fields.index,
    _id: id,
    _score: 1,
    _source: {
      'event.action': getRandomBoolean() ? 'active' : 'open',
      'kibana.alert.status': 'active',
      '@timestamp': '2025-03-13T15:32:09.536Z',
      'kibana.alert.rule.execution.timestamp': '2025-03-13T15:32:09.536Z',
      'kibana.alert.start': activeTime,
      'kibana.alert.time_range': {
        gte: activeTime,
      },
      'kibana.alert.url':
        '/app/management/insightsAndAlerting/triggersActions/rule/70d901ae-e24d-4f54-a775-6c1a5a174083',
      'kibana.alert.reason':
        'Document count is 21 in the last 5d in .kibana-event-log* index. Alert when greater than 0.',
      'kibana.alert.title':
        "rule 'Elasticsearch query rule - stack rules visibility' matched query",
      'kibana.alert.evaluation.conditions': 'Number of matching documents is greater than 0',
      'kibana.alert.evaluation.value': '21',
      'kibana.alert.evaluation.threshold': 0,
      'kibana.alert.rule.category': fields.ruleCategory,
      'kibana.alert.rule.consumer': fields.ruleConsumer,
      'kibana.alert.rule.rule_type_id': fields.ruleType,
      'kibana.alert.rule.execution.uuid': 'be66e717-62f7-42a3-90d8-bb3bf3a30d2b',
      'kibana.alert.rule.name': 'Elasticsearch query rule - stack rules visibility',
      'kibana.alert.rule.parameters': {},
      'kibana.alert.rule.producer': 'stackAlerts',
      'kibana.alert.rule.revision': 0,
      'kibana.alert.rule.tags': [],
      'kibana.alert.rule.uuid': '70d901ae-e24d-4f54-a775-6c1a5a174083',
      'kibana.space_ids': [spaceId],
      'event.kind': 'signal',
      'kibana.alert.action_group': 'query matched',
      'kibana.alert.flapping': false,
      'kibana.alert.flapping_history': [true, false, false, false],
      'kibana.alert.instance.id': 'query matched',
      'kibana.alert.maintenance_window_ids': [],
      'kibana.alert.consecutive_matches': 4,
      'kibana.alert.pending_recovered_count': 0,
      'kibana.alert.uuid': 'cd5c75f1-cdf1-4d15-9b7c-15b5c8b83fd2',
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.duration.us': 180051000,
      'kibana.version': '9.1.0',
      tags: [],
      'kibana.alert.previous_action_group': 'query matched',
    },
  };
};

export const inactiveStackAlertsOlderThan90 = [
  // 3 stack alerts that became inactive more than 90 days ago
  {
    space1: { id: '4b26af93-e0b9-45d1-9002-42441a4f14ee' },
    default: { id: '5760aff4-da99-4403-a26b-bd21889c1e73' },
    time: moment.utc().subtract(100, 'days').toISOString(),
  },
  {
    space1: { id: '3cc3e4f1-0a62-4dfd-b694-39f5c36ae433' },
    default: { id: '8f375775-3dac-4da1-8e63-e03b89566d9d' },
    time: moment.utc().subtract(101, 'days').toISOString(),
  },
  {
    space1: { id: '74b1ff35-8691-4a41-bb67-27f69bc5d737' },
    default: { id: 'bd72c41c-a904-4a29-a8fc-27026acb9496' },
    time: moment.utc().subtract(99, 'days').toISOString(),
  },
];

export const inactiveStackAlertsNewerThan90 = [
  // 2 stack alerts that became inactive less than 90 days ago
  {
    space1: { id: 'd6f34698-4fca-4e17-bfc2-d2a10d84a19e' },
    default: { id: '44b33c3f-cb45-4397-bf70-6fe487d99b5c' },
    time: moment.utc().subtract(50, 'days').toISOString(),
  },
  {
    space1: { id: '8b7fa7a2-ae26-4b45-a612-74f1018c02e8' },
    default: { id: '448bfa8a-360b-4c6e-a71d-4d491b182ad2' },
    time: moment.utc().subtract(45, 'days').toISOString(),
  },
];

export const activeStackAlertsOlderThan90 = [
  // 4 stack alerts that have been active for more than 90 days
  {
    space1: { id: 'e39c8793-a0a9-4e6a-92b7-dcea46bd4e80' },
    default: { id: 'da00d551-c318-4f58-b618-11f9781ec61e' },
    time: moment.utc().subtract(100, 'days').toISOString(),
  },
  {
    space1: { id: '23bf06ea-f3a2-42f7-816e-2ca37eb9e11d' },
    default: { id: '58fc1f4d-f949-4f51-b838-a72bef44656c' },
    time: moment.utc().subtract(150, 'days').toISOString(),
  },
  {
    space1: { id: '58993d1a-0bec-4952-a2e8-7884608f8775' },
    default: { id: '3711cf80-8f8b-4575-b21d-2c9f4fd4f9ef' },
    time: moment.utc().subtract(120, 'days').toISOString(),
  },
  {
    space1: { id: '7f6fe52f-447e-4e91-b036-a9b1bb021aba' },
    default: { id: '581d0d3d-303a-4909-b631-62c97dea0473' },
    time: moment.utc().subtract(125, 'days').toISOString(),
  },
];

export const activeStackAlertsNewerThan90 = [
  // 1 stack alert that has been active for less than 90 days
  {
    space1: { id: 'ea673c2e-fa32-4455-9460-97112235bcd5' },
    default: { id: 'f10fb95f-7e4f-4d2d-a84a-96d5f9076298' },
    time: moment.utc().subtract(25, 'days').toISOString(),
  },
];

export const inactiveO11yAlertsOlderThan90 = [
  // 2 o11y alerts that became inactive more than 90 days ago
  {
    space1: { id: 'ac4a2809-2a9e-48b9-98f0-2faaff83dc52' },
    default: { id: '034115eb-9edc-47be-b717-817346f1f108' },
    time: moment.utc().subtract(99, 'days').toISOString(),
  },
  {
    space1: { id: '6095bbed-5995-4c16-a1bf-312de2408516' },
    default: { id: '2b71e992-f67a-409d-b5f2-e9b7a312e681' },
    time: moment.utc().subtract(108, 'days').toISOString(),
  },
];

export const inactiveO11yAlertsNewerThan90 = [
  // 3 o11y alerts that became inactive less than 90 days ago
  {
    space1: { id: 'c3fb1fc2-7309-44c8-b723-eb118a3f9b6e' },
    default: { id: '48e93b15-a59e-4b5a-94f4-739d85b29e6c' },
    time: moment.utc().subtract(10, 'days').toISOString(),
  },
  {
    space1: { id: '534ce6b6-bf83-47a7-b1be-c3846a03182e' },
    default: { id: 'c533d7d8-ae2d-4401-a8dd-43fe30543b13' },
    time: moment.utc().subtract(5, 'days').toISOString(),
  },
  {
    space1: { id: '2ba40369-6477-4e78-ba18-a55c546fa65b' },
    default: { id: 'fe1e22d2-3ba3-4c85-9ca3-3df869b80d46' },
    time: moment.utc().subtract(23, 'days').toISOString(),
  },
];

export const activeO11yAlertsOlderThan90 = [
  // 1 o11y alert that has been active for more than 90 days
  {
    space1: { id: 'eae0e607-1f15-4722-ad32-bbb8353a8ba5' },
    default: { id: 'cdad1860-5ffd-4d41-8518-f7f3c237b2c9' },
    time: moment.utc().subtract(98, 'days').toISOString(),
  },
];

export const activeO11yAlertsNewerThan90 = [
  // 4 o11y alerts that have been active for less than 90 days
  {
    space1: { id: '03d38d1d-f44e-4c6a-a1c8-34bbad86e29a' },
    default: { id: 'f5d1c3fb-de14-46db-9c55-ff660d4ca81e' },
    time: moment.utc().subtract(2, 'days').toISOString(),
  },
  {
    space1: { id: 'fa579125-65f0-467e-83bd-b5186492a417' },
    default: { id: 'ec7e005a-d69f-4ca0-a480-006bcb47d1c4' },
    time: moment.utc().subtract(24, 'days').toISOString(),
  },
  {
    space1: { id: '669b3dd8-85b8-4f6c-b68a-f0a845d19120' },
    default: { id: 'ad987d9f-9714-4b73-a383-10a7c7761051' },
    time: moment.utc().subtract(7, 'days').toISOString(),
  },
  {
    space1: { id: '5a6bfc58-d80b-497e-aa1b-e494c4ea6354' },
    default: { id: '9a6a0a3a-206a-4aa4-9ebe-ed0c52f4585e' },
    time: moment.utc().subtract(3, 'days').toISOString(),
  },
];

export const inactiveSecurityAlertsOlderThan90 = [
  // 5 security alerts that became inactive more than 90 days ago
  {
    space1: { id: '6219593d-92d2-4436-a294-7942ecc9ec2d' },
    default: { id: '7d694d7f-2f5e-4549-bf31-bd31512f30c2' },
    time: moment.utc().subtract(200, 'days').toISOString(),
  },
  {
    space1: { id: '56ab31e5-624d-42b5-980b-6fe434c3e88a' },
    default: { id: '470fd3c3-0bc8-4900-8d9b-7d1a0bcd6fdc' },
    time: moment.utc().subtract(365, 'days').toISOString(),
  },
  {
    space1: { id: 'ef8b165c-8147-493e-9455-11dda6eb34f9' },
    default: { id: '7359744c-b03e-4e58-8421-d518087f0830' },
    time: moment.utc().subtract(450, 'days').toISOString(),
  },
  {
    space1: { id: '7da21baf-3601-493a-be1e-8ea8a51eb855' },
    default: { id: 'c8cdcced-01fd-4e05-934b-87097b8bbbe3' },
    time: moment.utc().subtract(92, 'days').toISOString(),
  },
  {
    space1: { id: 'c0fc97f9-d45b-451a-bcf8-1f9453670447' },
    default: { id: 'a895b383-195b-4ca0-af4d-c9165983885f' },
    time: moment.utc().subtract(91, 'days').toISOString(),
  },
];

export const inactiveSecurityAlertsNewerThan90 = [
  // 1 security alert that became inactive less than 90 days ago
  {
    space1: { id: '8ec8ffe7-15f1-45b7-befb-75c2b68169b5' },
    default: { id: '7f57affa-10d2-44b2-9413-dda04735e574' },
    time: moment.utc().subtract(3, 'days').toISOString(),
  },
];

export const activeSecurityAlertsOlderThan90 = [
  // 3 security alerts that have been active for more than 90 days
  {
    space1: { id: 'c8c4ae1e-f4d1-45e3-b1dd-5da48089f4c4' },
    default: { id: 'e60b7216-1984-4884-b632-07232388ec8e' },
    time: moment.utc().subtract(99, 'days').toISOString(),
  },
  {
    space1: { id: '27e98d3d-0e76-4a6d-8594-62da5cf96d31' },
    default: { id: '118b6910-ee68-4391-867a-f7fc260c03f3' },
    time: moment.utc().subtract(103, 'days').toISOString(),
  },
  {
    space1: { id: '04d1acb7-29df-4f85-9a51-9683e59dcbaa' },
    default: { id: 'fb5a0046-fb69-460a-839a-3aa614f2259b' },
    time: moment.utc().subtract(102, 'days').toISOString(),
  },
];

export const activeSecurityAlertsNewerThan90 = [
  // 6 security alerts that have been active for less than 90 days
  {
    space1: { id: 'e3576ffa-cb51-4527-9b30-e82b12e7c8a7' },
    default: { id: 'd54b9a9e-eea2-4fee-9c1e-23d6bb002cd9' },
    time: moment.utc().subtract(25, 'days').toISOString(),
  },
  {
    space1: { id: '879a0f8f-53eb-429c-b773-e2baf4657013' },
    default: { id: '6e6c2f6e-39e2-422b-bc19-2fb5dca0956c' },
    time: moment.utc().subtract(25, 'days').toISOString(),
  },
  {
    space1: { id: '727589ac-27a2-489d-a790-ef2da59a1e04' },
    default: { id: '5226a3bd-5d30-41ec-8885-78e9dc63c957' },
    time: moment.utc().subtract(25, 'days').toISOString(),
  },
  {
    space1: { id: '0fed8503-01bb-4fa0-bab3-33efef5ab9bc' },
    default: { id: '2050f633-5663-46b4-a8f0-20c4cde6b36c' },
    time: moment.utc().subtract(25, 'days').toISOString(),
  },
  {
    space1: { id: '446dcee3-2c92-4a72-b6cd-9e6357283e3c' },
    default: { id: 'ab287131-dfbb-4116-8ef7-0189fb4840f6' },
    time: moment.utc().subtract(25, 'days').toISOString(),
  },
  {
    space1: { id: '58f52b91-4835-4da2-8596-4052efecfefa' },
    default: { id: '9e5a420f-4110-4355-ad14-32776e5d820a' },
    time: moment.utc().subtract(25, 'days').toISOString(),
  },
];

export const getTestAlertDocs = (spaceId: string = 'space1') => [
  ...inactiveStackAlertsOlderThan90.map((input) =>
    getRecoveredAlert(get(input, spaceId)?.id, 'stack', input.time, spaceId, getRandomBoolean())
  ),
  ...inactiveStackAlertsNewerThan90.map((input) =>
    getRecoveredAlert(get(input, spaceId)?.id, 'stack', input.time, spaceId, getRandomBoolean())
  ),
  ...activeStackAlertsOlderThan90.map((input) =>
    getActiveAlert(get(input, spaceId)?.id, 'stack', input.time, spaceId)
  ),
  ...activeStackAlertsNewerThan90.map((input) =>
    getActiveAlert(get(input, spaceId)?.id, 'stack', input.time, spaceId)
  ),

  ...inactiveO11yAlertsOlderThan90.map((input) =>
    getRecoveredAlert(get(input, spaceId)?.id, 'o11y', input.time, spaceId, getRandomBoolean())
  ),
  ...inactiveO11yAlertsNewerThan90.map((input) =>
    getRecoveredAlert(get(input, spaceId)?.id, 'o11y', input.time, spaceId, getRandomBoolean())
  ),
  ...activeO11yAlertsOlderThan90.map((input) =>
    getActiveAlert(get(input, spaceId)?.id, 'o11y', input.time, spaceId)
  ),
  ...activeO11yAlertsNewerThan90.map((input) =>
    getActiveAlert(get(input, spaceId)?.id, 'o11y', input.time, spaceId)
  ),

  ...inactiveSecurityAlertsOlderThan90.map((input) =>
    getAcknowledgedOrClosedDetectionAlert(
      get(input, spaceId)?.id,
      'security',
      input.time,
      spaceId,
      getRandomBoolean()
    )
  ),
  ...inactiveSecurityAlertsNewerThan90.map((input) =>
    getAcknowledgedOrClosedDetectionAlert(
      get(input, spaceId)?.id,
      'security',
      input.time,
      spaceId,
      getRandomBoolean()
    )
  ),
  ...activeSecurityAlertsOlderThan90.map((input) =>
    getActiveAlert(get(input, spaceId)?.id, 'security', input.time, spaceId)
  ),
  ...activeSecurityAlertsNewerThan90.map((input) =>
    getActiveAlert(get(input, spaceId)?.id, 'security', input.time, spaceId)
  ),
];
