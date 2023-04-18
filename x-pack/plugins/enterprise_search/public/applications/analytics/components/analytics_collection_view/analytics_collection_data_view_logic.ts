/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { DataView } from '@kbn/data-views-plugin/common';

import { KibanaLogic } from '../../../shared/kibana/kibana_logic';

import { FetchAnalyticsCollectionLogic } from './fetch_analytics_collection_logic';

interface AnalyticsCollectionDataViewLogicValues {
  dataView: DataView | null;
}

interface AnalyticsCollectionDataViewLogicActions {
  setDataView(dataView: DataView): { dataView: DataView };
}

export const AnalyticsCollectionDataViewLogic = kea<
  MakeLogicType<AnalyticsCollectionDataViewLogicValues, AnalyticsCollectionDataViewLogicActions>
>({
  actions: {
    setDataView: (dataView) => ({ dataView }),
  },
  listeners: ({ actions }) => ({
    [FetchAnalyticsCollectionLogic.actionTypes.apiSuccess]: async (collection) => {
      let dataView = (
        await KibanaLogic.values.data.dataViews.find(collection.events_datastream, 1)
      )?.[0];

      if (!dataView) {
        dataView = await KibanaLogic.values.data.dataViews.createAndSave(
          {
            allowNoIndex: true,
            name: `behavioral_analytics.events-${collection.name}`,
            timeFieldName: '@timestamp',
            title: collection.events_datastream,
          },
          true
        );
      }

      actions.setDataView(dataView);
    },
  }),
  path: ['enterprise_search', 'analytics', 'collections', 'dataView'],
  reducers: () => ({
    dataView: [null, { setDataView: (_, { dataView }) => dataView }],
  }),
});
