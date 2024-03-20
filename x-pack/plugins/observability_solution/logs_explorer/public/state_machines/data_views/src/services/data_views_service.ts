/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvokeCreator } from 'xstate';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { createComparatorByField } from '../../../../utils/comparator_by_field';
import { DataViewDescriptor } from '../../../../../common/data_views/models/data_view_descriptor';
import {
  DataViewsContext,
  DataViewsEvent,
  DataViewsFilterParams,
  DataViewsSearchParams,
} from '../types';

interface LoadDataViewsServiceDeps {
  dataViews: DataViewsPublicPluginStart;
}

export const loadDataViews =
  ({ dataViews }: LoadDataViewsServiceDeps): InvokeCreator<DataViewsContext, DataViewsEvent> =>
  async (context) => {
    const searchParams = context.search;

    if (context.cache.has(searchParams)) {
      return context.cache.get(searchParams);
    }

    return dataViews
      .getIdsWithTitle()
      .then((views) => views.map(DataViewDescriptor.create))
      .then((views) => searchDataViews(views, searchParams, context.filter));
  };

export const searchDataViews = (
  dataViews: DataViewDescriptor[],
  search: DataViewsSearchParams,
  filter: DataViewsFilterParams
) => {
  const { name, sortOrder } = search;
  const { dataType } = filter;

  return dataViews
    .filter((dataView) => Boolean(dataView.name?.includes(name ?? '')))
    .filter((dataView) => !dataType || Boolean(dataView.dataType === dataType))
    .sort(createComparatorByField('name', sortOrder));
};
