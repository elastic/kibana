/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securitySolutionSpecProvider } from '.';
import { OVERVIEW_DASHBOARD_ID, SAMPLE_DATA_VIEW_ID } from './constants';

jest.mock('./saved_objects', () => ({
  getSavedObjects: jest.fn((spaceId: string) => ({
    spaceId,
  })),
}));

jest.mock('./auditbeat_field_mappings', () => ({
  auditbeatFieldMappings: {},
}));

jest.mock('./alerts_field_mappings', () => ({
  alertsFieldMappings: {},
}));

jest.mock('path', () => ({
  join: jest.fn((dir, path) => path),
}));

describe('securitySolutionSpecProvider', () => {
  it('returns a valid sample dataset schema with default spaceId', () => {
    const sampleDataset = securitySolutionSpecProvider();

    expect(sampleDataset.id).toEqual('securitysolution');
    expect(sampleDataset.name).toEqual('Sample Security Solution data');
    expect(sampleDataset.description).toEqual(
      'Sample data, visualizations, and dashboards for exploring Security Solution.'
    );
    expect(sampleDataset.previewImagePath).toEqual(
      '/plugins/securitySolution/assets/images/siem.png'
    );
    expect(sampleDataset.overviewDashboard).toEqual(OVERVIEW_DASHBOARD_ID);
    expect(sampleDataset.defaultIndex).toEqual(SAMPLE_DATA_VIEW_ID);
    expect(sampleDataset.savedObjects).toEqual({ spaceId: 'default' });
  });

  it('returns a valid sample dataset schema with a custom spaceId', () => {
    const customSpaceId = 'custom-space-id';
    const sampleDataset = securitySolutionSpecProvider(customSpaceId);

    expect(sampleDataset.id).toEqual('securitysolution');
    expect(sampleDataset.name).toEqual('Sample Security Solution data');
    expect(sampleDataset.description).toEqual(
      'Sample data, visualizations, and dashboards for exploring Security Solution.'
    );
    expect(sampleDataset.previewImagePath).toEqual(
      '/plugins/securitySolution/assets/images/siem.png'
    );
    expect(sampleDataset.overviewDashboard).toEqual(OVERVIEW_DASHBOARD_ID);
    expect(sampleDataset.defaultIndex).toEqual(SAMPLE_DATA_VIEW_ID);
    expect(sampleDataset.savedObjects).toEqual({ spaceId: customSpaceId });
  });
});

describe('securitySolutionSpecProvider dataIndices', () => {
  const sampleDataset = securitySolutionSpecProvider();

  it('should match the snapshot for the first dataIndex', () => {
    expect(sampleDataset.dataIndices[0]).toMatchInlineSnapshot(`
      Object {
        "aliases": Object {
          "auditbeat-sample-data": Object {},
        },
        "currentTimeMarker": "2018-01-09T00:00:00",
        "dataPath": "./data/auditbeat.json.gz",
        "deleteAliasWhenRemoved": true,
        "fields": Object {},
        "id": "auditbeat",
        "indexSettings": Object {
          "default_pipeline": "Security_Solution_auditbeat_sample_data_ingest_pipeline",
        },
        "pipeline": Object {
          "description": "This adjust @timestamp field to the time when data was ingested.",
          "id": "Security_Solution_auditbeat_sample_data_ingest_pipeline",
          "processors": Array [
            Object {
              "set": Object {
                "field": "@timestamp",
                "ignore_failure": true,
                "value": Array [
                  "{{ _ingest.timestamp }}",
                ],
              },
            },
          ],
        },
        "preserveDayOfWeekTimeOfDay": true,
        "timeFields": Array [
          "@timestamp",
        ],
      }
    `);
  });

  it('should match the snapshot for the second dataIndex', () => {
    expect(sampleDataset.dataIndices[1]).toMatchInlineSnapshot(`
      Object {
        "aliases": Object {
          "logs-sample-data": Object {},
        },
        "currentTimeMarker": "2018-01-09T00:00:00",
        "dataPath": "./data/logs.json.gz",
        "deleteAliasWhenRemoved": true,
        "fields": Object {},
        "id": "logs",
        "indexSettings": Object {
          "default_pipeline": "Security_Solution_logs_sample_data_ingest_pipeline",
          "mapping": Object {
            "total_fields": Object {
              "limit": 6000,
            },
          },
        },
        "pipeline": Object {
          "description": "This adjust @timestamp field to the time when data was ingested.",
          "id": "Security_Solution_logs_sample_data_ingest_pipeline",
          "processors": Array [
            Object {
              "set": Object {
                "field": "@timestamp",
                "ignore_failure": true,
                "value": Array [
                  "{{ _ingest.timestamp }}",
                ],
              },
            },
          ],
        },
        "preserveDayOfWeekTimeOfDay": true,
        "timeFields": Array [
          "@timestamp",
          "alert.actions.createdAt",
        ],
      }
    `);
  });

  it('should match the snapshot for the third dataIndex', () => {
    expect(sampleDataset.dataIndices[2]).toMatchInlineSnapshot(`
      Object {
        "aliases": Object {
          ".alerts-security.alerts-default": Object {},
        },
        "currentTimeMarker": "2018-01-09T00:00:00",
        "dataPath": "./data/alerts.json.gz",
        "deleteAliasWhenRemoved": false,
        "dynamicTemplates": Array [
          Object {
            "container.labels": Object {
              "mapping": Object {
                "type": "keyword",
              },
              "match_mapping_type": "string",
              "path_match": "container.labels.*",
            },
          },
          Object {
            "winlog.user_data": Object {
              "mapping": Object {
                "type": "keyword",
              },
              "match_mapping_type": "string",
              "path_match": "winlog.user_data.*",
            },
          },
          Object {
            "winlog.event_data": Object {
              "mapping": Object {
                "type": "keyword",
              },
              "match_mapping_type": "string",
              "path_match": "winlog.user_data.*",
            },
          },
          Object {
            "strings_as_keyword": Object {
              "mapping": Object {
                "type": "keyword",
              },
              "match_mapping_type": "string",
            },
          },
        ],
        "fields": Object {},
        "id": "alerts",
        "indexSettings": Object {
          "default_pipeline": "Security_Solution_alerts_sample_data_ingest_pipeline",
          "mapping": Object {
            "total_fields": Object {
              "limit": 6000,
            },
          },
        },
        "pipeline": Object {
          "description": "This set kibana.space_ids to current space and adjust @timestamp field to the time when data was ingested.",
          "id": "Security_Solution_alerts_sample_data_ingest_pipeline",
          "processors": Array [
            Object {
              "set": Object {
                "field": "kibana.space_ids",
                "ignore_failure": true,
                "value": Array [
                  "default",
                ],
              },
            },
            Object {
              "set": Object {
                "field": "kibana.alert.workflow_status",
                "ignore_failure": true,
                "value": Array [
                  "open",
                ],
              },
            },
            Object {
              "set": Object {
                "field": "kibana.alert.severity",
                "ignore_failure": true,
                "value": Array [
                  "critical",
                ],
              },
            },
            Object {
              "set": Object {
                "field": "kibana.alert.rule.uuid",
                "ignore_failure": true,
                "value": Array [
                  "6cd9adb6-f751-4add-868f-cfce6e408f32",
                ],
              },
            },
            Object {
              "set": Object {
                "field": "kibana.alert.rule.name",
                "ignore_failure": true,
                "value": Array [
                  "Malware Prevention Alert",
                ],
              },
            },
            Object {
              "set": Object {
                "field": "@timestamp",
                "ignore_failure": true,
                "value": Array [
                  "{{ _ingest.timestamp }}",
                ],
              },
            },
            Object {
              "set": Object {
                "field": "alert.actions.createdAt",
                "ignore_failure": true,
                "value": Array [
                  "{{ _ingest.timestamp }}",
                ],
              },
            },
            Object {
              "set": Object {
                "field": "alert.createdAt",
                "ignore_failure": true,
                "value": Array [
                  "{{ _ingest.timestamp }}",
                ],
              },
            },
            Object {
              "set": Object {
                "field": "updated_at",
                "ignore_failure": true,
                "value": Array [
                  "{{ _ingest.timestamp }}",
                ],
              },
            },
            Object {
              "set": Object {
                "field": "event.ingested",
                "ignore_failure": true,
                "value": Array [
                  "{{_ingest.timestamp}}",
                ],
              },
            },
            Object {
              "set": Object {
                "field": "agent.type",
                "ignore_failure": true,
                "value": Array [
                  "endpoint",
                ],
              },
            },
          ],
        },
        "preserveDayOfWeekTimeOfDay": true,
        "timeFields": Array [
          "@timestamp",
          "alert.actions.createdAt",
          "updated_at",
          "alert.createdAt",
        ],
      }
    `);
  });
});
