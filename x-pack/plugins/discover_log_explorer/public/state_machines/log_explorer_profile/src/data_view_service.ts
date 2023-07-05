/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { InvokeCreator } from 'xstate';
import { LogExplorerProfileContext, LogExplorerProfileEvent } from './types';

interface LogExplorerProfileDataViewStateDependencies {
  dataViews: DataViewsPublicPluginStart;
  stateContainer: DiscoverStateContainer;
}

export const createAndSetDataView =
  ({
    dataViews,
    stateContainer,
  }: LogExplorerProfileDataViewStateDependencies): InvokeCreator<
    LogExplorerProfileContext,
    LogExplorerProfileEvent
  > =>
  async (context) => {
    const dataView = await dataViews.create(context.datasetSelection.toDataviewSpec());

    stateContainer.actions.setDataView(dataView);

    return dataView;
  };
