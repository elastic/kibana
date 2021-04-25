/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { getMigrations, isAnyActionSupportIncidents } from './migrations';
import { RawAlert } from '../types';
import { SavedObjectUnsanitizedDoc } from 'kibana/server';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { migrationMocks } from 'src/core/server/mocks';

const migrationContext = migrationMocks.createContext();
const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();

describe('7.10.0', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(
      (shouldMigrateWhenPredicate, migration) => migration
    );
  });

  test('marks alerts as legacy', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({});
    expect(migration710(alert, migrationContext)).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
      },
    });
  });

  test('migrates the consumer for metrics', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({
      consumer: 'metrics',
    });
    expect(migration710(alert, migrationContext)).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        consumer: 'infrastructure',
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
      },
    });
  });

  test('migrates the consumer for siem', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({
      consumer: 'securitySolution',
    });
    expect(migration710(alert, migrationContext)).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        consumer: 'siem',
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
      },
    });
  });

  test('migrates the consumer for alerting', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({
      consumer: 'alerting',
    });
    expect(migration710(alert, migrationContext)).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        consumer: 'alerts',
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
      },
    });
  });

  test('migrates PagerDuty actions to set a default dedupkey of the AlertId', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({
      actions: [
        {
          actionTypeId: '.pagerduty',
          group: 'default',
          params: {
            summary: 'fired {{alertInstanceId}}',
            eventAction: 'resolve',
            component: '',
          },
          id: 'b62ea790-5366-4abc-a7df-33db1db78410',
        },
      ],
    });
    expect(migration710(alert, migrationContext)).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        actions: [
          {
            actionTypeId: '.pagerduty',
            group: 'default',
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
    });
  });

  test('skips PagerDuty actions with a specified dedupkey', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({
      actions: [
        {
          actionTypeId: '.pagerduty',
          group: 'default',
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
    expect(migration710(alert, migrationContext)).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        actions: [
          {
            actionTypeId: '.pagerduty',
            group: 'default',
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
    });
  });

  test('skips PagerDuty actions with an eventAction of "trigger"', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({
      actions: [
        {
          actionTypeId: '.pagerduty',
          group: 'default',
          params: {
            summary: 'fired {{alertInstanceId}}',
            eventAction: 'trigger',
            component: '',
          },
          id: 'b62ea790-5366-4abc-a7df-33db1db78410',
        },
      ],
    });
    expect(migration710(alert, migrationContext)).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        meta: {
          versionApiKeyLastmodified: 'pre-7.10.0',
        },
        actions: [
          {
            actionTypeId: '.pagerduty',
            group: 'default',
            params: {
              summary: 'fired {{alertInstanceId}}',
              eventAction: 'trigger',
              component: '',
            },
            id: 'b62ea790-5366-4abc-a7df-33db1db78410',
          },
        ],
      },
    });
  });

  test('creates execution status', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData();
    const dateStart = Date.now();
    const migratedAlert = migration710(alert, migrationContext);
    const dateStop = Date.now();
    const dateExecutionStatus = Date.parse(
      migratedAlert.attributes.executionStatus.lastExecutionDate
    );

    expect(dateStart).toBeLessThanOrEqual(dateExecutionStatus);
    expect(dateStop).toBeGreaterThanOrEqual(dateExecutionStatus);

    expect(migratedAlert).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
        executionStatus: {
          lastExecutionDate: migratedAlert.attributes.executionStatus.lastExecutionDate,
          status: 'pending',
          error: null,
        },
      },
    });
  });
});

describe('7.10.0 migrates with failure', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementationOnce(() => () => {
      throw new Error(`Can't migrate!`);
    });
  });

  test('should show the proper exception', () => {
    const migration710 = getMigrations(encryptedSavedObjectsSetup)['7.10.0'];
    const alert = getMockData({
      consumer: 'alerting',
    });
    const res = migration710(alert, migrationContext);
    expect(res).toMatchObject({
      ...alert,
      attributes: {
        ...alert.attributes,
      },
    });
    expect(migrationContext.log.error).toHaveBeenCalledWith(
      `encryptedSavedObject 7.10.0 migration failed for alert ${alert.id} with error: Can't migrate!`,
      {
        migrations: {
          alertDocument: {
            ...alert,
            attributes: {
              ...alert.attributes,
            },
          },
        },
      }
    );
  });
});

describe('7.11.0', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(
      (shouldMigrateWhenPredicate, migration) => migration
    );
  });

  test('add updatedAt field to alert - set to SavedObject updated_at attribute', () => {
    const migration711 = getMigrations(encryptedSavedObjectsSetup)['7.11.0'];
    const alert = getMockData({}, true);
    expect(migration711(alert, migrationContext)).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
        updatedAt: alert.updated_at,
        notifyWhen: 'onActiveAlert',
      },
    });
  });

  test('add updatedAt field to alert - set to createdAt when SavedObject updated_at is not defined', () => {
    const migration711 = getMigrations(encryptedSavedObjectsSetup)['7.11.0'];
    const alert = getMockData({});
    expect(migration711(alert, migrationContext)).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
        updatedAt: alert.attributes.createdAt,
        notifyWhen: 'onActiveAlert',
      },
    });
  });

  test('add notifyWhen=onActiveAlert when throttle is null', () => {
    const migration711 = getMigrations(encryptedSavedObjectsSetup)['7.11.0'];
    const alert = getMockData({});
    expect(migration711(alert, migrationContext)).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
        updatedAt: alert.attributes.createdAt,
        notifyWhen: 'onActiveAlert',
      },
    });
  });

  test('add notifyWhen=onActiveAlert when throttle is set', () => {
    const migration711 = getMigrations(encryptedSavedObjectsSetup)['7.11.0'];
    const alert = getMockData({ throttle: '5m' });
    expect(migration711(alert, migrationContext)).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
        updatedAt: alert.attributes.createdAt,
        notifyWhen: 'onThrottleInterval',
      },
    });
  });
});

describe('7.11.2', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(
      (shouldMigrateWhenPredicate, migration) => migration
    );
  });

  test('transforms connectors that support incident correctly', () => {
    const migration7112 = getMigrations(encryptedSavedObjectsSetup)['7.11.2'];
    const alert = getMockData({
      actions: [
        {
          actionTypeId: '.jira',
          group: 'threshold met',
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

    expect(migration7112(alert, migrationContext)).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
        actions: [
          {
            actionTypeId: '.jira',
            group: 'threshold met',
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
    });
  });

  test('it transforms only subAction=pushToService', () => {
    const migration7112 = getMigrations(encryptedSavedObjectsSetup)['7.11.2'];
    const alert = getMockData({
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

    expect(migration7112(alert, migrationContext)).toEqual(alert);
  });

  test('it does not transforms other connectors', () => {
    const migration7112 = getMigrations(encryptedSavedObjectsSetup)['7.11.2'];
    const alert = getMockData({
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

    expect(migration7112(alert, migrationContext)).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
        actions: [
          alert.attributes.actions![0],
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
      },
    });
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

  test('it does not transforms alerts when the right structure connectors is already applied', () => {
    const migration7112 = getMigrations(encryptedSavedObjectsSetup)['7.11.2'];
    const alert = getMockData({
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

    expect(migration7112(alert, migrationContext)).toEqual(alert);
  });

  test('if incident attribute is an empty object, copy back the related attributes from subActionParams back to incident', () => {
    const migration7112 = getMigrations(encryptedSavedObjectsSetup)['7.11.2'];
    const alert = getMockData({
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

    expect(migration7112(alert, migrationContext)).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
        actions: [
          alert.attributes.actions![0],
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
      },
    });
  });

  test('custom action does not get migrated/loss', () => {
    const migration7112 = getMigrations(encryptedSavedObjectsSetup)['7.11.2'];
    const alert = getMockData({
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

    expect(migration7112(alert, migrationContext)).toEqual(alert);
  });
});

describe('7.13.0', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(
      (shouldMigrateWhenPredicate, migration) => migration
    );
  });
  test('security solution alerts get migrated and remove null values', () => {
    const migration713 = getMigrations(encryptedSavedObjectsSetup)['7.13.0'];
    const alert = getMockData({
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

    expect(migration713(alert, migrationContext)).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
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
    });
  });

  test('non-null values in security solution alerts are not modified', () => {
    const migration713 = getMigrations(encryptedSavedObjectsSetup)['7.13.0'];
    const alert = getMockData({
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

    expect(migration713(alert, migrationContext)).toEqual(alert);
  });

  test('security solution threshold alert with string in threshold.field is migrated to array', () => {
    const migration713 = getMigrations(encryptedSavedObjectsSetup)['7.13.0'];
    const alert = getMockData({
      alertTypeId: 'siem.signals',
      params: {
        threshold: {
          field: 'host.id',
          value: 5,
        },
      },
    });

    expect(migration713(alert, migrationContext)).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
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
    });
  });

  test('security solution threshold alert with empty string in threshold.field is migrated to empty array', () => {
    const migration713 = getMigrations(encryptedSavedObjectsSetup)['7.13.0'];
    const alert = getMockData({
      alertTypeId: 'siem.signals',
      params: {
        threshold: {
          field: '',
          value: 5,
        },
      },
    });

    expect(migration713(alert, migrationContext)).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
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
    });
  });

  test('security solution threshold alert with array in threshold.field and cardinality is left alone', () => {
    const migration713 = getMigrations(encryptedSavedObjectsSetup)['7.13.0'];
    const alert = getMockData({
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

    expect(migration713(alert, migrationContext)).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
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
    });
  });

  test('security solution ML alert with string in machineLearningJobId is converted to an array', () => {
    const migration713 = getMigrations(encryptedSavedObjectsSetup)['7.13.0'];
    const alert = getMockData({
      alertTypeId: 'siem.signals',
      params: {
        anomalyThreshold: 20,
        machineLearningJobId: 'my_job_id',
      },
    });

    expect(migration713(alert, migrationContext)).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
        params: {
          anomalyThreshold: 20,
          machineLearningJobId: ['my_job_id'],
          exceptionsList: [],
          riskScoreMapping: [],
          severityMapping: [],
          threat: [],
        },
      },
    });
  });

  test('security solution ML alert with an array in machineLearningJobId is preserved', () => {
    const migration713 = getMigrations(encryptedSavedObjectsSetup)['7.13.0'];
    const alert = getMockData({
      alertTypeId: 'siem.signals',
      params: {
        anomalyThreshold: 20,
        machineLearningJobId: ['my_job_id', 'my_other_job_id'],
      },
    });

    expect(migration713(alert, migrationContext)).toEqual({
      ...alert,
      attributes: {
        ...alert.attributes,
        params: {
          anomalyThreshold: 20,
          machineLearningJobId: ['my_job_id', 'my_other_job_id'],
          exceptionsList: [],
          riskScoreMapping: [],
          severityMapping: [],
          threat: [],
        },
      },
    });
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
