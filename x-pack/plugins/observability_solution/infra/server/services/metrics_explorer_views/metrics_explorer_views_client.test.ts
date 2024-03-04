/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { MetricsExplorerViewAttributes } from '../../../common/metrics_explorer_views';

import { InfraSource } from '../../lib/sources';
import { createInfraSourcesMock } from '../../lib/sources/mocks';
import { metricsExplorerViewSavedObjectName } from '../../saved_objects/metrics_explorer_view';
import { MetricsExplorerViewsClient } from './metrics_explorer_views_client';
import { createMetricsExplorerViewMock } from '../../../common/metrics_explorer_views/metrics_explorer_view.mock';
import { UpdateMetricsExplorerViewAttributesRequestPayload } from '../../../common/http_api/latest';

describe('MetricsExplorerViewsClient class', () => {
  const mockFindMetricsExplorerList = (
    savedObjectsClient: jest.Mocked<SavedObjectsClientContract>
  ) => {
    const metricsExplorerViewListMock = [
      createMetricsExplorerViewMock('0', {
        isDefault: true,
      } as MetricsExplorerViewAttributes),
      createMetricsExplorerViewMock('default_id', {
        name: 'Default view 2',
        isStatic: false,
      } as MetricsExplorerViewAttributes),
      createMetricsExplorerViewMock('custom_id', {
        name: 'Custom',
        isStatic: false,
      } as MetricsExplorerViewAttributes),
    ];

    savedObjectsClient.find.mockResolvedValue({
      total: 2,
      saved_objects: metricsExplorerViewListMock.slice(1).map((view) => ({
        ...view,
        type: metricsExplorerViewSavedObjectName,
        score: 0,
        references: [],
      })),
      per_page: 1000,
      page: 1,
    });

    return metricsExplorerViewListMock;
  };

  describe('.find', () => {
    it('resolves the list of existing metrics explorer views', async () => {
      const { metricsExplorerViewsClient, infraSources, savedObjectsClient } =
        createMetricsExplorerViewsClient();

      infraSources.getSourceConfiguration.mockResolvedValue(basicTestSourceConfiguration);

      const metricsExplorerViewListMock = mockFindMetricsExplorerList(savedObjectsClient);

      const metricsExplorerViewList = await metricsExplorerViewsClient.find({});

      expect(savedObjectsClient.find).toHaveBeenCalled();
      expect(metricsExplorerViewList).toEqual(metricsExplorerViewListMock);
    });

    it('always resolves at least the static metrics explorer view', async () => {
      const { metricsExplorerViewsClient, infraSources, savedObjectsClient } =
        createMetricsExplorerViewsClient();

      const metricsExplorerViewListMock = [
        createMetricsExplorerViewMock('0', {
          isDefault: true,
        } as MetricsExplorerViewAttributes),
      ];

      infraSources.getSourceConfiguration.mockResolvedValue(basicTestSourceConfiguration);

      savedObjectsClient.find.mockResolvedValue({
        total: 2,
        saved_objects: [],
        per_page: 1000,
        page: 1,
      });

      const metricsExplorerViewList = await metricsExplorerViewsClient.find({});

      expect(savedObjectsClient.find).toHaveBeenCalled();
      expect(metricsExplorerViewList).toEqual(metricsExplorerViewListMock);
    });
  });

  it('.get resolves the an metrics explorer view by id', async () => {
    const { metricsExplorerViewsClient, infraSources, savedObjectsClient } =
      createMetricsExplorerViewsClient();

    const metricsExplorerViewMock = createMetricsExplorerViewMock('custom_id', {
      name: 'Custom',
      isDefault: false,
      isStatic: false,
    } as MetricsExplorerViewAttributes);

    infraSources.getSourceConfiguration.mockResolvedValue(basicTestSourceConfiguration);

    savedObjectsClient.get.mockResolvedValue({
      ...metricsExplorerViewMock,
      type: metricsExplorerViewSavedObjectName,
      references: [],
    });

    const metricsExplorerView = await metricsExplorerViewsClient.get('custom_id', {});

    expect(savedObjectsClient.get).toHaveBeenCalled();
    expect(metricsExplorerView).toEqual(metricsExplorerViewMock);
  });

  describe('.update', () => {
    it('update an existing metrics explorer view by id', async () => {
      const { metricsExplorerViewsClient, infraSources, savedObjectsClient } =
        createMetricsExplorerViewsClient();

      const metricsExplorerViews = mockFindMetricsExplorerList(savedObjectsClient);

      const metricsExplorerViewMock = {
        ...metricsExplorerViews[1],
        attributes: {
          ...metricsExplorerViews[1].attributes,
          name: 'New name',
        },
      };

      infraSources.getSourceConfiguration.mockResolvedValue(basicTestSourceConfiguration);

      savedObjectsClient.create.mockResolvedValue({
        ...metricsExplorerViewMock,
        type: metricsExplorerViewSavedObjectName,
        references: [],
      });

      const metricsExplorerView = await metricsExplorerViewsClient.update(
        'default_id',
        {
          name: 'New name',
        } as UpdateMetricsExplorerViewAttributesRequestPayload,
        {}
      );

      expect(savedObjectsClient.create).toHaveBeenCalled();
      expect(metricsExplorerView).toEqual(metricsExplorerViewMock);
    });

    it('throws an error when a conflicting name is given', async () => {
      const { metricsExplorerViewsClient, savedObjectsClient } = createMetricsExplorerViewsClient();

      mockFindMetricsExplorerList(savedObjectsClient);

      await expect(
        async () =>
          await metricsExplorerViewsClient.update(
            'default_id',
            {
              name: 'Custom',
            } as UpdateMetricsExplorerViewAttributesRequestPayload,
            {}
          )
      ).rejects.toThrow('A view with that name already exists.');
    });
  });

  it('.delete removes an metrics explorer view by id', async () => {
    const { metricsExplorerViewsClient, savedObjectsClient } = createMetricsExplorerViewsClient();

    savedObjectsClient.delete.mockResolvedValue({});

    const metricsExplorerView = await metricsExplorerViewsClient.delete('custom_id');

    expect(savedObjectsClient.delete).toHaveBeenCalled();
    expect(metricsExplorerView).toEqual({});
  });
});

const createMetricsExplorerViewsClient = () => {
  const logger = loggerMock.create();
  const savedObjectsClient = savedObjectsClientMock.create();
  const infraSources = createInfraSourcesMock();

  const metricsExplorerViewsClient = new MetricsExplorerViewsClient(
    logger,
    savedObjectsClient,
    infraSources
  );

  return {
    infraSources,
    metricsExplorerViewsClient,
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
    metricsExplorerDefaultView: '0',
    anomalyThreshold: 0,
  },
};
