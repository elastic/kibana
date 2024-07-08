/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { SavedObject, SavedObjectsUtils } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import { dataViewsService as dataViewsServiceMock } from '@kbn/data-views-plugin/server/mocks';
import {
  defaultLogViewId,
  LogView,
  LogViewAttributes,
  LogViewsStaticConfig,
} from '../../../common/log_views';
import { createLogViewMock } from '../../../common/log_views/log_view.mock';
import {
  extractLogViewSavedObjectReferences,
  logViewSavedObjectName,
} from '../../saved_objects/log_view';
import { LogViewsClient } from './log_views_client';
import { createLogSourcesServiceMock } from '@kbn/logs-data-access-plugin/common/services/log_sources_service/log_sources_service.mocks';

describe('LogViewsClient class', () => {
  it('getLogView resolves the default id to a real saved object id if it exists', async () => {
    const { logViewsClient, savedObjectsClient } = createLogViewsClient();

    const logViewMock = createLogViewMock('SAVED_OBJECT_ID');
    const logViewSavedObject: SavedObject<LogViewAttributes> = {
      ...extractLogViewSavedObjectReferences(logViewMock.attributes),
      id: logViewMock.id,
      type: logViewSavedObjectName,
    };

    savedObjectsClient.get.mockResolvedValue(logViewSavedObject);

    savedObjectsClient.find.mockResolvedValue({
      total: 1,
      saved_objects: [
        {
          score: 0,
          ...logViewSavedObject,
        },
      ],
      per_page: 1,
      page: 1,
    });

    const logView = await logViewsClient.getLogView(defaultLogViewId);

    expect(savedObjectsClient.get).toHaveBeenCalledWith(logViewSavedObjectName, 'SAVED_OBJECT_ID');
    expect(logView).toEqual(logViewMock);
  });

  it('getLogView preserves non-default ids', async () => {
    const { logViewsClient, savedObjectsClient } = createLogViewsClient();

    const logViewMock = createLogViewMock('SAVED_OBJECT_ID');
    const logViewSavedObject: SavedObject<LogViewAttributes> = {
      ...extractLogViewSavedObjectReferences(logViewMock.attributes),
      id: logViewMock.id,
      type: logViewSavedObjectName,
    };

    savedObjectsClient.get.mockResolvedValue(logViewSavedObject);

    savedObjectsClient.find.mockResolvedValue({
      total: 1,
      saved_objects: [
        {
          score: 0,
          ...logViewSavedObject,
        },
      ],
      per_page: 1,
      page: 1,
    });

    const logView = await logViewsClient.getLogView('SAVED_OBJECT_ID');

    expect(savedObjectsClient.get).toHaveBeenCalledWith(logViewSavedObjectName, 'SAVED_OBJECT_ID');
    expect(logView).toEqual(logViewMock);
  });

  it('getLogView preserves the default id for fallback lookups', async () => {
    const { logViewFallbackHandler, logViewsClient, savedObjectsClient } = createLogViewsClient();

    logViewFallbackHandler.mockResolvedValue(basicTestSourceConfiguration);

    savedObjectsClient.find.mockResolvedValue({
      total: 0,
      saved_objects: [],
      per_page: 0,
      page: 1,
    });

    await logViewsClient.getLogView(defaultLogViewId);

    expect(logViewFallbackHandler).toHaveBeenCalledWith(defaultLogViewId, {
      soClient: savedObjectsClient,
    });
  });

  it('putLogView resolves the default id to a real saved object id if one exists', async () => {
    const { logViewsClient, savedObjectsClient } = createLogViewsClient();

    const existingLogViewMock = createLogViewMock('SAVED_OBJECT_ID');
    const existingLogViewSavedObject: SavedObject<LogViewAttributes> = {
      ...extractLogViewSavedObjectReferences(existingLogViewMock.attributes),
      id: existingLogViewMock.id,
      type: logViewSavedObjectName,
    };

    const newLogViewMock = createLogViewMock('SAVED_OBJECT_ID', 'stored', { name: 'New Log View' });
    const newLogViewSavedObject: SavedObject<LogViewAttributes> = {
      ...extractLogViewSavedObjectReferences(newLogViewMock.attributes),
      id: newLogViewMock.id,
      type: logViewSavedObjectName,
    };

    savedObjectsClient.create.mockResolvedValue(newLogViewSavedObject);

    savedObjectsClient.find.mockResolvedValue({
      total: 1,
      saved_objects: [
        {
          score: 0,
          ...existingLogViewSavedObject,
        },
      ],
      per_page: 1,
      page: 1,
    });

    const logView = await logViewsClient.putLogView(defaultLogViewId, newLogViewMock.attributes);

    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      logViewSavedObjectName,
      newLogViewMock.attributes,
      expect.objectContaining({ id: 'SAVED_OBJECT_ID' })
    );
    expect(logView).toEqual(newLogViewMock);
  });

  it('putLogView resolves the default id to a new uuid if no default exists', async () => {
    const { logViewsClient, savedObjectsClient } = createLogViewsClient();

    const newLogViewMock = createLogViewMock('NOT_THE_FINAL_ID', 'stored', {
      name: 'New Log View',
    });
    const newLogViewSavedObject: SavedObject<LogViewAttributes> = {
      ...extractLogViewSavedObjectReferences(newLogViewMock.attributes),
      id: newLogViewMock.id,
      type: logViewSavedObjectName,
    };

    savedObjectsClient.create.mockImplementation(async (_type, _attributes, { id = '' } = {}) => ({
      ...newLogViewSavedObject,
      id,
    }));

    savedObjectsClient.find.mockResolvedValue({
      total: 0,
      saved_objects: [],
      per_page: 0,
      page: 1,
    });

    const logView = await logViewsClient.putLogView(defaultLogViewId, newLogViewMock.attributes);

    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      logViewSavedObjectName,
      newLogViewMock.attributes,
      expect.objectContaining({
        id: expect.any(String), // the id was generated
      })
    );
    expect(logView).toEqual(
      expect.objectContaining({
        ...newLogViewMock,
        id: expect.any(String), // the id was generated
      })
    );
    expect(SavedObjectsUtils.isRandomId(logView.id)).toBeTruthy();
  });

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

    const resolvedLogView = await logViewsClient.resolveLogView('log-view-id', {
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
        "dataViewReference": DataView {
          "allowHidden": false,
          "allowNoIndex": false,
          "deleteFieldFormat": [Function],
          "deleteScriptedFieldInternal": [Function],
          "etag": undefined,
          "fieldAttrs": Object {},
          "fieldFormatMap": Object {},
          "fieldFormats": Object {
            "deserialize": [MockFunction],
            "getByFieldType": [MockFunction],
            "getDefaultConfig": [MockFunction],
            "getDefaultInstance": [MockFunction],
            "getDefaultInstanceCacheResolver": [MockFunction],
            "getDefaultInstancePlain": [MockFunction],
            "getDefaultType": [MockFunction],
            "getDefaultTypeName": [MockFunction],
            "getInstance": [MockFunction],
            "getType": [MockFunction],
            "getTypeNameByEsTypes": [MockFunction],
            "getTypeWithoutMetaParams": [MockFunction],
            "has": [MockFunction],
            "init": [MockFunction],
            "parseDefaultTypeMap": [MockFunction],
            "register": [MockFunction],
          },
          "fields": FldList [],
          "flattenHit": [Function],
          "getAllowHidden": [Function],
          "getEtag": [Function],
          "getFieldAttrs": [Function],
          "getIndexPattern": [Function],
          "getName": [Function],
          "getOriginalSavedObjectBody": [Function],
          "id": "LOG_DATA_VIEW",
          "matchedIndices": Array [],
          "metaFields": Array [
            "_id",
            "_type",
            "_source",
          ],
          "name": "",
          "namespaces": Array [],
          "originalSavedObjectBody": Object {},
          "resetOriginalSavedObjectBody": [Function],
          "runtimeFieldMap": Object {
            "runtime_field": Object {
              "script": Object {
                "source": "emit(\\"runtime value\\")",
              },
              "type": "keyword",
            },
          },
          "scriptedFieldsMap": Object {},
          "setAllowHidden": [Function],
          "setEtag": [Function],
          "setFieldFormat": [Function],
          "setIndexPattern": [Function],
          "shortDotsEnable": false,
          "sourceFilters": Array [],
          "timeFieldName": "@timestamp",
          "title": "log-indices-*",
          "type": undefined,
          "typeMeta": undefined,
          "upsertScriptedField": [Function],
          "upsertScriptedFieldInternal": [Function],
          "version": "1",
        },
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
  const logSourcesService = createLogSourcesServiceMock();
  const savedObjectsClient = savedObjectsClientMock.create();
  const logViewFallbackHandler = jest.fn();
  const internalLogViews = new Map<string, LogView>();
  const logViewStaticConfig: LogViewsStaticConfig = {
    messageFields: ['message'],
  };

  const logViewsClient = new LogViewsClient(
    logger,
    Promise.resolve(dataViews),
    Promise.resolve(logSourcesService),
    savedObjectsClient,
    logViewFallbackHandler,
    internalLogViews,
    logViewStaticConfig
  );

  return {
    dataViews,
    logViewFallbackHandler,
    internalLogViews,
    logViewStaticConfig,
    logViewsClient,
    savedObjectsClient,
  };
};

const basicTestSourceConfiguration = {
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
