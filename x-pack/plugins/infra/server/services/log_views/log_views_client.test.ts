/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { createStubDataView } from 'src/plugins/data_views/common/stubs';
import { dataViewsService as dataViewsServiceMock } from 'src/plugins/data_views/server/mocks';
import { LogView, LogViewsStaticConfig } from '../../../common/log_views';
import { InfraSource } from '../../lib/sources';
import { createInfraSourcesMock } from '../../lib/sources/mocks';
import { getAttributesFromSourceConfiguration, LogViewsClient } from './log_views_client';

describe('getAttributesFromSourceConfiguration function', () => {
  it('converts the index_pattern log indices type to data_view', () => {
    const logViewAttributes = getAttributesFromSourceConfiguration(basicTestSourceConfiguration);

    expect(logViewAttributes.logIndices).toEqual({
      type: 'data_view',
      dataViewId: 'INDEX_PATTERN_ID',
    });
  });

  it('preserves the index_name log indices type', () => {
    const logViewAttributes = getAttributesFromSourceConfiguration({
      ...basicTestSourceConfiguration,
      configuration: {
        ...basicTestSourceConfiguration.configuration,
        logIndices: {
          type: 'index_name',
          indexName: 'INDEX_NAME',
        },
      },
    });

    expect(logViewAttributes.logIndices).toEqual({
      type: 'index_name',
      indexName: 'INDEX_NAME',
    });
  });
});

describe('LogViewsClient class', () => {
  it('resolveLogView method resolves given LogViewAttributes with DataView reference', async () => {
    const { logViewsClient, dataViews } = createLogViewsClient();

    dataViews.get.mockResolvedValue(
      createStubDataView({
        spec: {
          id: 'LOG_DATA_VIEW',
          title: 'log-indices-*',
          timeFieldName: '@timestamp',
          runtimeFieldMap: {
            runtime_field: {
              type: 'keyword',
              script: {
                source: 'emit("runtime value")',
              },
            },
          },
        },
      })
    );

    const resolvedLogView = await logViewsClient.resolveLogView({
      name: 'LOG VIEW',
      description: 'LOG VIEW DESCRIPTION',
      logIndices: {
        type: 'data_view',
        dataViewId: 'LOG_DATA_VIEW',
      },
      logColumns: [
        { timestampColumn: { id: 'TIMESTAMP_COLUMN_ID' } },
        {
          fieldColumn: {
            id: 'DATASET_COLUMN_ID',
            field: 'event.dataset',
          },
        },
        {
          messageColumn: { id: 'MESSAGE_COLUMN_ID' },
        },
      ],
    });

    expect(resolvedLogView).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "timestampColumn": Object {
              "id": "TIMESTAMP_COLUMN_ID",
            },
          },
          Object {
            "fieldColumn": Object {
              "field": "event.dataset",
              "id": "DATASET_COLUMN_ID",
            },
          },
          Object {
            "messageColumn": Object {
              "id": "MESSAGE_COLUMN_ID",
            },
          },
        ],
        "description": "LOG VIEW DESCRIPTION",
        "fields": FldList [],
        "indices": "log-indices-*",
        "messageField": Array [
          "message",
        ],
        "name": "LOG VIEW",
        "runtimeMappings": Object {
          "runtime_field": Object {
            "script": Object {
              "source": "emit(\\"runtime value\\")",
            },
            "type": "keyword",
          },
        },
        "tiebreakerField": "_doc",
        "timestampField": "@timestamp",
      }
    `);
  });
});

const createLogViewsClient = () => {
  const logger = loggerMock.create();
  const dataViews = dataViewsServiceMock;
  const savedObjectsClient = savedObjectsClientMock.create();
  const infraSources = createInfraSourcesMock();
  const internalLogViews = new Map<string, LogView>();
  const logViewStaticConfig: LogViewsStaticConfig = {
    messageFields: ['message'],
  };

  const logViewsClient = new LogViewsClient(
    logger,
    Promise.resolve(dataViews),
    savedObjectsClient,
    infraSources,
    internalLogViews,
    logViewStaticConfig
  );

  return {
    dataViews,
    infraSources,
    internalLogViews,
    logViewStaticConfig,
    logViewsClient,
    savedObjectsClient,
  };
};

const basicTestSourceConfiguration: InfraSource = {
  id: 'ID',
  origin: 'stored',
  configuration: {
    name: 'NAME',
    description: 'DESCRIPTION',
    logIndices: {
      type: 'index_pattern',
      indexPatternId: 'INDEX_PATTERN_ID',
    },
    logColumns: [],
    fields: {
      message: [],
    },
    metricAlias: 'METRIC_ALIAS',
    inventoryDefaultView: 'INVENTORY_DEFAULT_VIEW',
    metricsExplorerDefaultView: 'METRICS_EXPLORER_DEFAULT_VIEW',
    anomalyThreshold: 0,
  },
};
