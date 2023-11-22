/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { InventoryViewAttributes } from '../../../common/inventory_views';

import { InfraSource } from '../../lib/sources';
import { createInfraSourcesMock } from '../../lib/sources/mocks';
import { inventoryViewSavedObjectName } from '../../saved_objects/inventory_view';
import { InventoryViewsClient } from './inventory_views_client';
import { createInventoryViewMock } from '../../../common/inventory_views/inventory_view.mock';
import { UpdateInventoryViewAttributesRequestPayload } from '../../../common/http_api/latest';

describe('InventoryViewsClient class', () => {
  const mockFindInventoryList = (savedObjectsClient: jest.Mocked<SavedObjectsClientContract>) => {
    const inventoryViewListMock = [
      createInventoryViewMock('0', {
        isDefault: true,
      } as InventoryViewAttributes),
      createInventoryViewMock('default_id', {
        name: 'Default view 2',
        isStatic: false,
      } as InventoryViewAttributes),
      createInventoryViewMock('custom_id', {
        name: 'Custom',
        isStatic: false,
      } as InventoryViewAttributes),
    ];

    savedObjectsClient.find.mockResolvedValue({
      total: 2,
      saved_objects: inventoryViewListMock.slice(1).map((view) => ({
        ...view,
        type: inventoryViewSavedObjectName,
        score: 0,
        references: [],
      })),
      per_page: 1000,
      page: 1,
    });

    return inventoryViewListMock;
  };

  describe('.find', () => {
    it('resolves the list of existing inventory views', async () => {
      const { inventoryViewsClient, infraSources, savedObjectsClient } =
        createInventoryViewsClient();

      infraSources.getSourceConfiguration.mockResolvedValue(basicTestSourceConfiguration);

      const inventoryViewListMock = mockFindInventoryList(savedObjectsClient);

      const inventoryViewList = await inventoryViewsClient.find({});

      expect(savedObjectsClient.find).toHaveBeenCalled();
      expect(inventoryViewList).toEqual(inventoryViewListMock);
    });

    it('always resolves at least the static inventory view', async () => {
      const { inventoryViewsClient, infraSources, savedObjectsClient } =
        createInventoryViewsClient();

      const inventoryViewListMock = [
        createInventoryViewMock('0', {
          isDefault: true,
        } as InventoryViewAttributes),
      ];

      infraSources.getSourceConfiguration.mockResolvedValue(basicTestSourceConfiguration);

      savedObjectsClient.find.mockResolvedValue({
        total: 2,
        saved_objects: [],
        per_page: 1000,
        page: 1,
      });

      const inventoryViewList = await inventoryViewsClient.find({});

      expect(savedObjectsClient.find).toHaveBeenCalled();
      expect(inventoryViewList).toEqual(inventoryViewListMock);
    });
  });

  it('.get resolves the an inventory view by id', async () => {
    const { inventoryViewsClient, infraSources, savedObjectsClient } = createInventoryViewsClient();

    const inventoryViewMock = createInventoryViewMock('custom_id', {
      name: 'Custom',
      isDefault: false,
      isStatic: false,
    } as InventoryViewAttributes);

    infraSources.getSourceConfiguration.mockResolvedValue(basicTestSourceConfiguration);

    savedObjectsClient.get.mockResolvedValue({
      ...inventoryViewMock,
      type: inventoryViewSavedObjectName,
      references: [],
    });

    const inventoryView = await inventoryViewsClient.get('custom_id', {});

    expect(savedObjectsClient.get).toHaveBeenCalled();
    expect(inventoryView).toEqual(inventoryViewMock);
  });

  describe('.update', () => {
    it('update an existing inventory view by id', async () => {
      const { inventoryViewsClient, infraSources, savedObjectsClient } =
        createInventoryViewsClient();

      const inventoryViews = mockFindInventoryList(savedObjectsClient);

      const inventoryViewMock = {
        ...inventoryViews[1],
        attributes: {
          ...inventoryViews[1].attributes,
          name: 'New name',
        },
      };

      infraSources.getSourceConfiguration.mockResolvedValue(basicTestSourceConfiguration);

      savedObjectsClient.create.mockResolvedValue({
        ...inventoryViewMock,
        type: inventoryViewSavedObjectName,
        references: [],
      });

      const inventoryView = await inventoryViewsClient.update(
        'default_id',
        {
          name: 'New name',
        } as UpdateInventoryViewAttributesRequestPayload,
        {}
      );

      expect(savedObjectsClient.create).toHaveBeenCalled();
      expect(inventoryView).toEqual(inventoryViewMock);
    });

    it('throws an error when a conflicting name is given', async () => {
      const { inventoryViewsClient, savedObjectsClient } = createInventoryViewsClient();

      mockFindInventoryList(savedObjectsClient);

      await expect(
        async () =>
          await inventoryViewsClient.update(
            'default_id',
            {
              name: 'Custom',
            } as UpdateInventoryViewAttributesRequestPayload,
            {}
          )
      ).rejects.toThrow('A view with that name already exists.');
    });
  });

  it('.delete removes an inventory view by id', async () => {
    const { inventoryViewsClient, savedObjectsClient } = createInventoryViewsClient();

    savedObjectsClient.delete.mockResolvedValue({});

    const inventoryView = await inventoryViewsClient.delete('custom_id');

    expect(savedObjectsClient.delete).toHaveBeenCalled();
    expect(inventoryView).toEqual({});
  });
});

const createInventoryViewsClient = () => {
  const logger = loggerMock.create();
  const savedObjectsClient = savedObjectsClientMock.create();
  const infraSources = createInfraSourcesMock();

  const inventoryViewsClient = new InventoryViewsClient(logger, savedObjectsClient, infraSources);

  return {
    infraSources,
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
    metricAlias: 'METRIC_ALIAS',
    inventoryDefaultView: '0',
    metricsExplorerDefaultView: 'METRICS_EXPLORER_DEFAULT_VIEW',
    anomalyThreshold: 0,
  },
};
