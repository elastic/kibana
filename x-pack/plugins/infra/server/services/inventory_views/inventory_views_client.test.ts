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
  defaultInventoryViewId,
  InventoryView,
  InventoryViewAttributes,
  InventoryViewsStaticConfig,
} from '../../../common/log_views';
import { createInventoryViewMock } from '../../../common/log_views/log_view.mock';
import { InfraSource } from '../../lib/sources';
import { createInfraSourcesMock } from '../../lib/sources/mocks';
import {
  extractInventoryViewSavedObjectReferences,
  inventoryViewSavedObjectName,
} from '../../saved_objects/log_view';
import {
  getAttributesFromSourceConfiguration,
  InventoryViewsClient,
} from './inventory_views_client';

describe('getAttributesFromSourceConfiguration function', () => {
  it('converts the index_pattern log indices type to data_view', () => {
    const inventoryViewAttributes = getAttributesFromSourceConfiguration(
      basicTestSourceConfiguration
    );

    expect(inventoryViewAttributes.logIndices).toEqual({
      type: 'data_view',
      dataViewId: 'INDEX_PATTERN_ID',
    });
  });

  it('preserves the index_name log indices type', () => {
    const inventoryViewAttributes = getAttributesFromSourceConfiguration({
      ...basicTestSourceConfiguration,
      configuration: {
        ...basicTestSourceConfiguration.configuration,
        logIndices: {
          type: 'index_name',
          indexName: 'INDEX_NAME',
        },
      },
    });

    expect(inventoryViewAttributes.logIndices).toEqual({
      type: 'index_name',
      indexName: 'INDEX_NAME',
    });
  });
});

describe('InventoryViewsClient class', () => {
  it('getInventoryView resolves the default id to a real saved object id if it exists', async () => {
    const { inventoryViewsClient, savedObjectsClient } = createInventoryViewsClient();

    const inventoryViewMock = createInventoryViewMock('SAVED_OBJECT_ID');
    const inventoryViewSavedObject: SavedObject<InventoryViewAttributes> = {
      ...extractInventoryViewSavedObjectReferences(inventoryViewMock.attributes),
      id: inventoryViewMock.id,
      type: inventoryViewSavedObjectName,
    };

    savedObjectsClient.get.mockResolvedValue(inventoryViewSavedObject);

    savedObjectsClient.find.mockResolvedValue({
      total: 1,
      saved_objects: [
        {
          score: 0,
          ...inventoryViewSavedObject,
        },
      ],
      per_page: 1,
      page: 1,
    });

    const inventoryView = await inventoryViewsClient.getInventoryView(defaultInventoryViewId);

    expect(savedObjectsClient.get).toHaveBeenCalledWith(
      inventoryViewSavedObjectName,
      'SAVED_OBJECT_ID'
    );
    expect(inventoryView).toEqual(inventoryViewMock);
  });

  it('getInventoryView preserves non-default ids', async () => {
    const { inventoryViewsClient, savedObjectsClient } = createInventoryViewsClient();

    const inventoryViewMock = createInventoryViewMock('SAVED_OBJECT_ID');
    const inventoryViewSavedObject: SavedObject<InventoryViewAttributes> = {
      ...extractInventoryViewSavedObjectReferences(inventoryViewMock.attributes),
      id: inventoryViewMock.id,
      type: inventoryViewSavedObjectName,
    };

    savedObjectsClient.get.mockResolvedValue(inventoryViewSavedObject);

    savedObjectsClient.find.mockResolvedValue({
      total: 1,
      saved_objects: [
        {
          score: 0,
          ...inventoryViewSavedObject,
        },
      ],
      per_page: 1,
      page: 1,
    });

    const inventoryView = await inventoryViewsClient.getInventoryView('SAVED_OBJECT_ID');

    expect(savedObjectsClient.get).toHaveBeenCalledWith(
      inventoryViewSavedObjectName,
      'SAVED_OBJECT_ID'
    );
    expect(inventoryView).toEqual(inventoryViewMock);
  });

  it('getInventoryView preserves the default id for fallback lookups', async () => {
    const { infraSources, inventoryViewsClient, savedObjectsClient } = createInventoryViewsClient();

    infraSources.getSourceConfiguration.mockResolvedValue(basicTestSourceConfiguration);

    savedObjectsClient.find.mockResolvedValue({
      total: 0,
      saved_objects: [],
      per_page: 0,
      page: 1,
    });

    await inventoryViewsClient.getInventoryView(defaultInventoryViewId);

    expect(infraSources.getSourceConfiguration).toHaveBeenCalledWith(
      savedObjectsClient,
      defaultInventoryViewId
    );
  });

  it('putInventoryView resolves the default id to a real saved object id if one exists', async () => {
    const { inventoryViewsClient, savedObjectsClient } = createInventoryViewsClient();

    const existingInventoryViewMock = createInventoryViewMock('SAVED_OBJECT_ID');
    const existingInventoryViewSavedObject: SavedObject<InventoryViewAttributes> = {
      ...extractInventoryViewSavedObjectReferences(existingInventoryViewMock.attributes),
      id: existingInventoryViewMock.id,
      type: inventoryViewSavedObjectName,
    };

    const newInventoryViewMock = createInventoryViewMock('SAVED_OBJECT_ID', 'stored', {
      name: 'New Log View',
    });
    const newInventoryViewSavedObject: SavedObject<InventoryViewAttributes> = {
      ...extractInventoryViewSavedObjectReferences(newInventoryViewMock.attributes),
      id: newInventoryViewMock.id,
      type: inventoryViewSavedObjectName,
    };

    savedObjectsClient.create.mockResolvedValue(newInventoryViewSavedObject);

    savedObjectsClient.find.mockResolvedValue({
      total: 1,
      saved_objects: [
        {
          score: 0,
          ...existingInventoryViewSavedObject,
        },
      ],
      per_page: 1,
      page: 1,
    });

    const inventoryView = await inventoryViewsClient.putInventoryView(
      defaultInventoryViewId,
      newInventoryViewMock.attributes
    );

    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      inventoryViewSavedObjectName,
      newInventoryViewMock.attributes,
      expect.objectContaining({ id: 'SAVED_OBJECT_ID' })
    );
    expect(inventoryView).toEqual(newInventoryViewMock);
  });

  it('putInventoryView resolves the default id to a new uuid if no default exists', async () => {
    const { inventoryViewsClient, savedObjectsClient } = createInventoryViewsClient();

    const newInventoryViewMock = createInventoryViewMock('NOT_THE_FINAL_ID', 'stored', {
      name: 'New Log View',
    });
    const newInventoryViewSavedObject: SavedObject<InventoryViewAttributes> = {
      ...extractInventoryViewSavedObjectReferences(newInventoryViewMock.attributes),
      id: newInventoryViewMock.id,
      type: inventoryViewSavedObjectName,
    };

    savedObjectsClient.create.mockImplementation(async (_type, _attributes, { id = '' } = {}) => ({
      ...newInventoryViewSavedObject,
      id,
    }));

    savedObjectsClient.find.mockResolvedValue({
      total: 0,
      saved_objects: [],
      per_page: 0,
      page: 1,
    });

    const inventoryView = await inventoryViewsClient.putInventoryView(
      defaultInventoryViewId,
      newInventoryViewMock.attributes
    );

    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      inventoryViewSavedObjectName,
      newInventoryViewMock.attributes,
      expect.objectContaining({
        id: expect.any(String), // the id was generated
      })
    );
    expect(inventoryView).toEqual(
      expect.objectContaining({
        ...newInventoryViewMock,
        id: expect.any(String), // the id was generated
      })
    );
    expect(SavedObjectsUtils.isRandomId(inventoryView.id)).toBeTruthy();
  });

  it('resolveInventoryView method resolves given InventoryViewAttributes with DataView reference', async () => {
    const { inventoryViewsClient, dataViews } = createInventoryViewsClient();

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

    const resolvedInventoryView = await inventoryViewsClient.resolveInventoryView('log-view-id', {
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

    expect(resolvedInventoryView).toMatchInlineSnapshot(`
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
          "allowNoIndex": false,
          "deleteFieldFormat": [Function],
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
          "setFieldFormat": [Function],
          "setIndexPattern": [Function],
          "shortDotsEnable": false,
          "sourceFilters": Array [],
          "timeFieldName": "@timestamp",
          "title": "log-indices-*",
          "type": undefined,
          "typeMeta": undefined,
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

const createInventoryViewsClient = () => {
  const logger = loggerMock.create();
  const dataViews = dataViewsServiceMock;
  const savedObjectsClient = savedObjectsClientMock.create();
  const infraSources = createInfraSourcesMock();
  const internalInventoryViews = new Map<string, InventoryView>();
  const inventoryViewStaticConfig: InventoryViewsStaticConfig = {
    messageFields: ['message'],
  };

  const inventoryViewsClient = new InventoryViewsClient(
    logger,
    Promise.resolve(dataViews),
    savedObjectsClient,
    infraSources,
    internalInventoryViews,
    inventoryViewStaticConfig
  );

  return {
    dataViews,
    infraSources,
    internalInventoryViews,
    inventoryViewStaticConfig,
    inventoryViewsClient,
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
