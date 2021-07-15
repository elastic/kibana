/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import uuid from 'uuid';
import { getMigrations, isAnyActionSupportIncidents } from './migrations';
import { RawAlert } from '../types';
import { SavedObjectUnsanitizedDoc } from 'kibana/server';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { migrationMocks } from 'src/core/server/mocks';

const migrationContext = migrationMocks.createContext();
const encryptedSavedObjectsSetupNoError = encryptedSavedObjectsMock.createSetup();
const encryptedSavedObjectsSetupThrowsError = encryptedSavedObjectsMock.createSetup();

let clock: sinon.SinonFakeTimers;

beforeAll(() => {
  clock = sinon.useFakeTimers();
  encryptedSavedObjectsSetupNoError.createMigration.mockImplementation((_, migration) => migration);
  encryptedSavedObjectsSetupThrowsError.createMigration.mockImplementation(() => () => {
    throw new Error(`Can't migrate!`);
  });
});
beforeEach(() => clock.reset());
afterAll(() => clock.restore());

function testMigrationWhenNoEsoErrors(
  rule: SavedObjectUnsanitizedDoc<Partial<RawAlert>>,
  expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>>,
  version: string
) {
  // should migrate correctly when no decrypt errors
  expect(
    getMigrations(encryptedSavedObjectsSetupNoError)[version](rule, migrationContext)
  ).toMatchObject(expectedMigratedRule);
}

function testMigrationWhenEsoThrowsError(
  rule: SavedObjectUnsanitizedDoc<Partial<RawAlert>>,
  expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>>,
  version: string
) {
  // should log error when decryption throws error but migrated correctly
  expect(
    getMigrations(encryptedSavedObjectsSetupThrowsError)[version](rule, migrationContext)
  ).toMatchObject(expectedMigratedRule);
  expect(migrationContext.log.error).toHaveBeenCalledWith(
    `encryptedSavedObject ${version} migration failed for rule ${rule.id} with error: Can't migrate!`,
    {
      migrations: {
        ruleDocument: rule,
      },
    }
  );
}

describe('7.10.0', () => {
  test('marks rules as legacy', () => {
    const rule = getMockData({});
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.10.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.10.0');
  });

  test('migrates the consumer for metrics', () => {
    const rule = getMockData({
      consumer: 'metrics',
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        consumer: 'infrastructure',
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.10.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.10.0');
  });

  test('migrates the consumer for siem', () => {
    const rule = getMockData({
      consumer: 'securitySolution',
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        consumer: 'siem',
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.10.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.10.0');
  });

  test('migrates the consumer for alerting', () => {
    const rule = getMockData({
      consumer: 'alerting',
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        consumer: 'alerts',
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.10.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.10.0');
  });

  test('migrates PagerDuty actions to set a default dedupkey of the AlertId', () => {
    const rule = getMockData({
      actions: [
        {
          actionTypeId: '.pagerduty',
          group: 'default',
          actionRef: '',
          params: {
            summary: 'fired {{alertInstanceId}}',
            eventAction: 'resolve',
            component: '',
          },
          id: 'b62ea790-5366-4abc-a7df-33db1db78410',
        },
      ],
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        actions: [
          {
            actionTypeId: '.pagerduty',
            group: 'default',
            actionRef: '',
            params: {
              summary: 'fired {{alertInstanceId}}',
              eventAction: 'resolve',
              dedupKey: '{{alertId}}',
              component: '',
            },
            id: 'b62ea790-5366-4abc-a7df-33db1db78410',
          },
        ],
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.10.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.10.0');
  });

  test('skips PagerDuty actions with a specified dedupkey', () => {
    const rule = getMockData({
      actions: [
        {
          actionTypeId: '.pagerduty',
          group: 'default',
          actionRef: '',
          params: {
            summary: 'fired {{alertInstanceId}}',
            eventAction: 'trigger',
            dedupKey: '{{alertInstanceId}}',
            component: '',
          },
          id: 'b62ea790-5366-4abc-a7df-33db1db78410',
        },
      ],
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        actions: [
          {
            actionTypeId: '.pagerduty',
            group: 'default',
            actionRef: '',
            params: {
              summary: 'fired {{alertInstanceId}}',
              eventAction: 'trigger',
              dedupKey: '{{alertInstanceId}}',
              component: '',
            },
            id: 'b62ea790-5366-4abc-a7df-33db1db78410',
          },
        ],
      },
    };
    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.10.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.10.0');
  });

  test('skips PagerDuty actions with an eventAction of "trigger"', () => {
    const rule = getMockData({
      actions: [
        {
          actionTypeId: '.pagerduty',
          group: 'default',
          actionRef: '',
          params: {
            summary: 'fired {{alertInstanceId}}',
            eventAction: 'trigger',
            component: '',
          },
          id: 'b62ea790-5366-4abc-a7df-33db1db78410',
        },
      ],
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
        actions: [
          {
            actionTypeId: '.pagerduty',
            group: 'default',
            actionRef: '',
            params: {
              summary: 'fired {{alertInstanceId}}',
              eventAction: 'trigger',
              component: '',
            },
            id: 'b62ea790-5366-4abc-a7df-33db1db78410',
          },
        ],
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.10.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.10.0');
  });

  test('creates execution status', () => {
    const rule = getMockData();
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        executionStatus: {
          lastExecutionDate: '1970-01-01T00:00:00.000Z',
          status: 'pending',
          error: null,
        },
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.10.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.10.0');
  });
});

describe('7.11.0', () => {
  test('add updatedAt field to rule - set to SavedObject updated_at attribute', () => {
    const rule = getMockData({}, true);
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        updatedAt: rule.updated_at,
        notifyWhen: 'onActiveAlert',
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.11.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.11.0');
  });

  test('add updatedAt field to rule - set to createdAt when SavedObject updated_at is not defined', () => {
    const rule = getMockData({});
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        updatedAt: rule.attributes.createdAt,
        notifyWhen: 'onActiveAlert',
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.11.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.11.0');
  });

  test('add notifyWhen=onActiveAlert when throttle is null', () => {
    const rule = getMockData({});
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        updatedAt: rule.attributes.createdAt,
        notifyWhen: 'onActiveAlert',
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.11.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.11.0');
  });

  test('add notifyWhen=onActiveAlert when throttle is set', () => {
    const rule = getMockData({ throttle: '5m' });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        updatedAt: rule.attributes.createdAt,
        notifyWhen: 'onThrottleInterval',
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.11.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.11.0');
  });
});

describe('7.11.2', () => {
  test('transforms connectors that support incident correctly', () => {
    const rule = getMockData({
      actions: [
        {
          actionTypeId: '.jira',
          group: 'threshold met',
          actionRef: '',
          params: {
            subAction: 'pushToService',
            subActionParams: {
              title: 'Jira summary',
              issueType: '10001',
              comments: [
                {
                  commentId: '1',
                  comment: 'jira comment',
                },
              ],
              description: 'Jira description',
              savedObjectId: '{{alertId}}',
              priority: 'Highest',
              parent: 'CASES-78',
              labels: ['test'],
            },
          },
          id: 'b1abe42d-ae1a-4a6a-b5ec-482ce0492c14',
        },
        {
          actionTypeId: '.resilient',
          group: 'threshold met',
          actionRef: '',
          params: {
            subAction: 'pushToService',
            subActionParams: {
              savedObjectId: '{{alertId}}',
              incidentTypes: ['17', '21'],
              severityCode: '5',
              title: 'IBM name',
              description: 'IBM description',
              comments: [
                {
                  commentId: 'alert-comment',
                  comment: 'IBM comment',
                },
              ],
            },
          },
          id: '75d63268-9a83-460f-9026-0028f4f7dac4',
        },
        {
          actionTypeId: '.servicenow',
          group: 'threshold met',
          actionRef: '',
          params: {
            subAction: 'pushToService',
            subActionParams: {
              severity: '2',
              impact: '2',
              urgency: '2',
              savedObjectId: '{{alertId}}',
              title: 'SN short desc',
              description: 'SN desc',
              comment: 'sn comment',
            },
          },
          id: '1266562a-4e1f-4305-99ca-1b44c469b26e',
        },
      ],
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        actions: [
          {
            actionTypeId: '.jira',
            group: 'threshold met',
            actionRef: '',
            params: {
              subAction: 'pushToService',
              subActionParams: {
                incident: {
                  summary: 'Jira summary',
                  description: 'Jira description',
                  issueType: '10001',
                  priority: 'Highest',
                  parent: 'CASES-78',
                  labels: ['test'],
                },
                comments: [
                  {
                    commentId: '1',
                    comment: 'jira comment',
                  },
                ],
              },
            },
            id: 'b1abe42d-ae1a-4a6a-b5ec-482ce0492c14',
          },
          {
            actionTypeId: '.resilient',
            group: 'threshold met',
            actionRef: '',
            params: {
              subAction: 'pushToService',
              subActionParams: {
                incident: {
                  name: 'IBM name',
                  description: 'IBM description',
                  incidentTypes: ['17', '21'],
                  severityCode: '5',
                },
                comments: [
                  {
                    commentId: 'alert-comment',
                    comment: 'IBM comment',
                  },
                ],
              },
            },
            id: '75d63268-9a83-460f-9026-0028f4f7dac4',
          },
          {
            actionTypeId: '.servicenow',
            group: 'threshold met',
            actionRef: '',
            params: {
              subAction: 'pushToService',
              subActionParams: {
                incident: {
                  short_description: 'SN short desc',
                  description: 'SN desc',
                  severity: '2',
                  impact: '2',
                  urgency: '2',
                },
                comments: [{ commentId: '1', comment: 'sn comment' }],
              },
            },
            id: '1266562a-4e1f-4305-99ca-1b44c469b26e',
          },
        ],
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.11.2');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.11.2');
  });

  test('it transforms only subAction=pushToService', () => {
    const rule = getMockData({
      actions: [
        {
          actionTypeId: '.jira',
          group: 'threshold met',
          params: {
            subAction: 'issues',
            subActionParams: { issues: 'Task' },
          },
          id: '1266562a-4e1f-4305-99ca-1b44c469b26e',
        },
      ],
    });

    testMigrationWhenNoEsoErrors(rule, rule, '7.11.2');
    testMigrationWhenEsoThrowsError(rule, rule, '7.11.2');
  });

  test('it does not transforms other connectors', () => {
    const rule = getMockData({
      actions: [
        {
          actionTypeId: '.server-log',
          group: 'threshold met',
          actionRef: '',
          params: {
            level: 'info',
            message: 'log message',
          },
          id: '99257478-e591-4560-b264-441bdd4fe1d9',
        },
        {
          actionTypeId: '.servicenow',
          group: 'threshold met',
          actionRef: '',
          params: {
            subAction: 'pushToService',
            subActionParams: {
              severity: '2',
              impact: '2',
              urgency: '2',
              savedObjectId: '{{alertId}}',
              title: 'SN short desc',
              description: 'SN desc',
              comment: 'sn comment',
            },
          },
          id: '1266562a-4e1f-4305-99ca-1b44c469b26e',
        },
      ],
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        actions: [
          rule.attributes.actions![0],
          {
            actionTypeId: '.servicenow',
            group: 'threshold met',
            actionRef: '',
            params: {
              subAction: 'pushToService',
              subActionParams: {
                incident: {
                  short_description: 'SN short desc',
                  description: 'SN desc',
                  severity: '2',
                  impact: '2',
                  urgency: '2',
                },
                comments: [{ commentId: '1', comment: 'sn comment' }],
              },
            },
            id: '1266562a-4e1f-4305-99ca-1b44c469b26e',
          },
        ],
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.11.2');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.11.2');
  });

  test.each(['.jira', '.servicenow', '.resilient'])(
    'isAnyActionSupportIncidents should return true when %s is in actions',
    (actionTypeId) => {
      const doc = {
        attributes: { actions: [{ actionTypeId }, { actionTypeId: '.server-log' }] },
      } as SavedObjectUnsanitizedDoc<RawAlert>;
      expect(isAnyActionSupportIncidents(doc)).toBe(true);
    }
  );

  test('isAnyActionSupportIncidents should return false when there is no connector that supports incidents', () => {
    const doc = {
      attributes: { actions: [{ actionTypeId: '.server-log' }] },
    } as SavedObjectUnsanitizedDoc<RawAlert>;
    expect(isAnyActionSupportIncidents(doc)).toBe(false);
  });

  test('it does not transforms rules when the right structure connectors is already applied', () => {
    const rule = getMockData({
      actions: [
        {
          actionTypeId: '.server-log',
          group: 'threshold met',
          params: {
            level: 'info',
            message: 'log message',
          },
          id: '99257478-e591-4560-b264-441bdd4fe1d9',
        },
        {
          actionTypeId: '.servicenow',
          group: 'threshold met',
          params: {
            subAction: 'pushToService',
            subActionParams: {
              incident: {
                short_description: 'SN short desc',
                description: 'SN desc',
                severity: '2',
                impact: '2',
                urgency: '2',
              },
              comments: [{ commentId: '1', comment: 'sn comment' }],
            },
          },
          id: '1266562a-4e1f-4305-99ca-1b44c469b26e',
        },
      ],
    });

    testMigrationWhenNoEsoErrors(rule, rule, '7.11.2');
    testMigrationWhenEsoThrowsError(rule, rule, '7.11.2');
  });

  test('if incident attribute is an empty object, copy back the related attributes from subActionParams back to incident', () => {
    const rule = getMockData({
      actions: [
        {
          actionTypeId: '.server-log',
          group: 'threshold met',
          actionRef: '',
          params: {
            level: 'info',
            message: 'log message',
          },
          id: '99257478-e591-4560-b264-441bdd4fe1d9',
        },
        {
          actionTypeId: '.servicenow',
          group: 'threshold met',
          actionRef: '',
          params: {
            subAction: 'pushToService',
            subActionParams: {
              short_description: 'SN short desc',
              description: 'SN desc',
              severity: '2',
              impact: '2',
              urgency: '2',
              incident: {},
              comments: [{ commentId: '1', comment: 'sn comment' }],
            },
          },
          id: '1266562a-4e1f-4305-99ca-1b44c469b26e',
        },
      ],
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        actions: [
          rule.attributes.actions![0],
          {
            actionTypeId: '.servicenow',
            group: 'threshold met',
            actionRef: '',
            params: {
              subAction: 'pushToService',
              subActionParams: {
                incident: {
                  short_description: 'SN short desc',
                  description: 'SN desc',
                  severity: '2',
                  impact: '2',
                  urgency: '2',
                },
                comments: [{ commentId: '1', comment: 'sn comment' }],
              },
            },
            id: '1266562a-4e1f-4305-99ca-1b44c469b26e',
          },
        ],
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.11.2');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.11.2');
  });

  test('custom action does not get migrated/loss', () => {
    const rule = getMockData({
      actions: [
        {
          actionTypeId: '.mike',
          group: 'threshold met',
          params: {
            subAction: 'pushToService',
            subActionParams: {
              short_description: 'SN short desc',
              description: 'SN desc',
              severity: '2',
              impact: '2',
              urgency: '2',
              incident: {},
              comments: [{ commentId: '1', comment: 'sn comment' }],
            },
          },
          id: '1266562a-4e1f-4305-99ca-1b44c469b26e',
        },
      ],
    });

    testMigrationWhenNoEsoErrors(rule, rule, '7.11.2');
    testMigrationWhenEsoThrowsError(rule, rule, '7.11.2');
  });
});

describe('7.13.0', () => {
  test('security solution rules get migrated and remove null values', () => {
    const rule = getMockData({
      alertTypeId: 'siem.signals',
      params: {
        author: ['Elastic'],
        buildingBlockType: null,
        description:
          "This rule detects a known command and control pattern in network events. The FIN7 threat group is known to use this command and control technique, while maintaining persistence in their target's network.",
        ruleId: '4a4e23cf-78a2-449c-bac3-701924c269d3',
        index: ['packetbeat-*'],
        falsePositives: [
          "This rule could identify benign domains that are formatted similarly to FIN7's command and control algorithm. Alerts should be investigated by an analyst to assess the validity of the individual observations.",
        ],
        from: 'now-6m',
        immutable: true,
        query:
          'event.category:(network OR network_traffic) AND type:(tls OR http) AND network.transport:tcp AND destination.domain:/[a-zA-Z]{4,5}.(pw|us|club|info|site|top)/ AND NOT destination.domain:zoom.us',
        language: 'lucene',
        license: 'Elastic License',
        outputIndex: '.siem-signals-rylandherrick_2-default',
        savedId: null,
        timelineId: null,
        timelineTitle: null,
        meta: null,
        filters: null,
        maxSignals: 100,
        riskScore: 73,
        riskScoreMapping: [],
        ruleNameOverride: null,
        severity: 'high',
        severityMapping: null,
        threat: null,
        threatFilters: null,
        timestampOverride: null,
        to: 'now',
        type: 'query',
        references: [
          'https://www.fireeye.com/blog/threat-research/2018/08/fin7-pursuing-an-enigmatic-and-evasive-global-criminal-operation.html',
        ],
        note:
          'In the event this rule identifies benign domains in your environment, the `destination.domain` field in the rule can be modified to include those domains. Example: `...AND NOT destination.domain:(zoom.us OR benign.domain1 OR benign.domain2)`.',
        version: 1,
        exceptionsList: null,
        threshold: {
          field: null,
          value: 5,
        },
      },
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        params: {
          author: ['Elastic'],
          description:
            "This rule detects a known command and control pattern in network events. The FIN7 threat group is known to use this command and control technique, while maintaining persistence in their target's network.",
          ruleId: '4a4e23cf-78a2-449c-bac3-701924c269d3',
          index: ['packetbeat-*'],
          falsePositives: [
            "This rule could identify benign domains that are formatted similarly to FIN7's command and control algorithm. Alerts should be investigated by an analyst to assess the validity of the individual observations.",
          ],
          from: 'now-6m',
          immutable: true,
          query:
            'event.category:(network OR network_traffic) AND type:(tls OR http) AND network.transport:tcp AND destination.domain:/[a-zA-Z]{4,5}.(pw|us|club|info|site|top)/ AND NOT destination.domain:zoom.us',
          language: 'lucene',
          license: 'Elastic License',
          outputIndex: '.siem-signals-rylandherrick_2-default',
          maxSignals: 100,
          riskScore: 73,
          riskScoreMapping: [],
          severity: 'high',
          severityMapping: [],
          threat: [],
          to: 'now',
          type: 'query',
          references: [
            'https://www.fireeye.com/blog/threat-research/2018/08/fin7-pursuing-an-enigmatic-and-evasive-global-criminal-operation.html',
          ],
          note:
            'In the event this rule identifies benign domains in your environment, the `destination.domain` field in the rule can be modified to include those domains. Example: `...AND NOT destination.domain:(zoom.us OR benign.domain1 OR benign.domain2)`.',
          version: 1,
          exceptionsList: [],
          threshold: {
            field: [],
            value: 5,
            cardinality: [],
          },
        },
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.13.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.13.0');
  });

  test('non-null values in security solution rules are not modified', () => {
    const rule = getMockData({
      alertTypeId: 'siem.signals',
      params: {
        author: ['Elastic'],
        buildingBlockType: 'default',
        description:
          "This rule detects a known command and control pattern in network events. The FIN7 threat group is known to use this command and control technique, while maintaining persistence in their target's network.",
        ruleId: '4a4e23cf-78a2-449c-bac3-701924c269d3',
        index: ['packetbeat-*'],
        falsePositives: [
          "This rule could identify benign domains that are formatted similarly to FIN7's command and control algorithm. Alerts should be investigated by an analyst to assess the validity of the individual observations.",
        ],
        from: 'now-6m',
        immutable: true,
        query:
          'event.category:(network OR network_traffic) AND type:(tls OR http) AND network.transport:tcp AND destination.domain:/[a-zA-Z]{4,5}.(pw|us|club|info|site|top)/ AND NOT destination.domain:zoom.us',
        language: 'lucene',
        license: 'Elastic License',
        outputIndex: '.siem-signals-rylandherrick_2-default',
        savedId: 'saved-id',
        timelineId: 'timeline-id',
        timelineTitle: 'timeline-title',
        meta: {
          field: 'value',
        },
        filters: ['filters'],
        maxSignals: 100,
        riskScore: 73,
        riskScoreMapping: ['risk-score-mapping'],
        ruleNameOverride: 'field.name',
        severity: 'high',
        severityMapping: ['severity-mapping'],
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0011',
              name: 'Command and Control',
              reference: 'https://attack.mitre.org/tactics/TA0011/',
            },
            technique: [
              {
                id: 'T1483',
                name: 'Domain Generation Algorithms',
                reference: 'https://attack.mitre.org/techniques/T1483/',
              },
            ],
          },
        ],
        threatFilters: ['threat-filter'],
        timestampOverride: 'event.ingested',
        to: 'now',
        type: 'query',
        references: [
          'https://www.fireeye.com/blog/threat-research/2018/08/fin7-pursuing-an-enigmatic-and-evasive-global-criminal-operation.html',
        ],
        note:
          'In the event this rule identifies benign domains in your environment, the `destination.domain` field in the rule can be modified to include those domains. Example: `...AND NOT destination.domain:(zoom.us OR benign.domain1 OR benign.domain2)`.',
        version: 1,
        exceptionsList: ['exceptions-list'],
      },
    });

    testMigrationWhenNoEsoErrors(rule, rule, '7.13.0');
    testMigrationWhenEsoThrowsError(rule, rule, '7.13.0');
  });

  test('security solution threshold rule with string in threshold.field is migrated to array', () => {
    const rule = getMockData({
      alertTypeId: 'siem.signals',
      params: {
        threshold: {
          field: 'host.id',
          value: 5,
        },
      },
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        params: {
          threshold: {
            field: ['host.id'],
            value: 5,
            cardinality: [],
          },
          exceptionsList: [],
          riskScoreMapping: [],
          severityMapping: [],
          threat: [],
        },
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.13.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.13.0');
  });

  test('security solution threshold rule with empty string in threshold.field is migrated to empty array', () => {
    const rule = getMockData({
      alertTypeId: 'siem.signals',
      params: {
        threshold: {
          field: '',
          value: 5,
        },
      },
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        params: {
          threshold: {
            field: [],
            value: 5,
            cardinality: [],
          },
          exceptionsList: [],
          riskScoreMapping: [],
          severityMapping: [],
          threat: [],
        },
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.13.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.13.0');
  });

  test('security solution threshold rule with array in threshold.field and cardinality is left alone', () => {
    const rule = getMockData({
      alertTypeId: 'siem.signals',
      params: {
        threshold: {
          field: ['host.id'],
          value: 5,
          cardinality: [
            {
              field: 'source.ip',
              value: 10,
            },
          ],
        },
      },
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        params: {
          threshold: {
            field: ['host.id'],
            value: 5,
            cardinality: [
              {
                field: 'source.ip',
                value: 10,
              },
            ],
          },
          exceptionsList: [],
          riskScoreMapping: [],
          severityMapping: [],
          threat: [],
        },
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.13.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.13.0');
  });

  test('security solution ML rule with string in machineLearningJobId is converted to an array', () => {
    const rule = getMockData({
      alertTypeId: 'siem.signals',
      params: {
        anomalyThreshold: 20,
        machineLearningJobId: 'my_job_id',
      },
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        params: {
          anomalyThreshold: 20,
          machineLearningJobId: ['my_job_id'],
          exceptionsList: [],
          riskScoreMapping: [],
          severityMapping: [],
          threat: [],
        },
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.13.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.13.0');
  });

  test('security solution ML rule with an array in machineLearningJobId is preserved', () => {
    const rule = getMockData({
      alertTypeId: 'siem.signals',
      params: {
        anomalyThreshold: 20,
        machineLearningJobId: ['my_job_id', 'my_other_job_id'],
      },
    });
    const expectedMigratedRule: SavedObjectUnsanitizedDoc<Partial<RawAlert>> = {
      ...rule,
      attributes: {
        ...rule.attributes,
        params: {
          anomalyThreshold: 20,
          machineLearningJobId: ['my_job_id', 'my_other_job_id'],
          exceptionsList: [],
          riskScoreMapping: [],
          severityMapping: [],
          threat: [],
        },
      },
    };

    testMigrationWhenNoEsoErrors(rule, expectedMigratedRule, '7.13.0');
    testMigrationWhenEsoThrowsError(rule, expectedMigratedRule, '7.13.0');
  });
});

function getUpdatedAt(): string {
  const updatedAt = new Date();
  updatedAt.setHours(updatedAt.getHours() + 2);
  return updatedAt.toISOString();
}

function getMockData(
  overwrites: Record<string, unknown> = {},
  withSavedObjectUpdatedAt: boolean = false
): SavedObjectUnsanitizedDoc<Partial<RawAlert>> {
  return {
    attributes: {
      enabled: true,
      name: 'abc',
      tags: ['foo'],
      alertTypeId: '123',
      consumer: 'bar',
      apiKey: '',
      apiKeyOwner: '',
      schedule: { interval: '10s' },
      throttle: null,
      params: {
        bar: true,
      },
      muteAll: false,
      mutedInstanceIds: [],
      createdBy: new Date().toISOString(),
      updatedBy: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      actions: [
        {
          group: 'default',
          actionRef: '1',
          actionTypeId: '1',
          params: {
            foo: true,
          },
        },
      ],
      ...overwrites,
    },
    updated_at: withSavedObjectUpdatedAt ? getUpdatedAt() : undefined,
    id: uuid.v4(),
    type: 'alert',
  };
}
