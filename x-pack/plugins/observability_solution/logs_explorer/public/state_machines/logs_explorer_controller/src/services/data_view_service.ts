/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { InvokeCreator } from 'xstate';
import { LogsExplorerControllerContext, LogsExplorerControllerEvent } from '../types';

export const createAdHocDataView =
  (): InvokeCreator<LogsExplorerControllerContext, LogsExplorerControllerEvent> =>
  async (context) => {
    if (!('discoverStateContainer' in context)) return;
    const { discoverStateContainer } = context;
    const dataView = await discoverStateContainer.actions.createAndAppendAdHocDataView(
      context.dataSourceSelection.toDataviewSpec()
    );
    /**
     * We can't fully rely on the url update of the index param to create and restore the data view
     * due to a race condition where Discover, when initializing its internal logic,
     * check the value the index params before it gets updated in the line above.
     * In case the index param does not exist, it then create a internal saved search and set the current data view
     * to the existing one or the default logs-*.
     * We set explicitly the data view here to be used when restoring the data view on the initial load.
     */
    discoverStateContainer.actions.setDataView(dataView);
  };

export const changeDataView =
  ({
    dataViews,
  }: {
    dataViews: DataViewsPublicPluginStart;
  }): InvokeCreator<LogsExplorerControllerContext, LogsExplorerControllerEvent> =>
  async (context) => {
    if (!('discoverStateContainer' in context)) return;
    const { discoverStateContainer } = context;

    // We need to manually retrieve the data view and force a set and change on the state container
    // to guarantee the correct update on the data view selection and avoid a race condition
    // when updating the control panels.
    const nextDataView = await dataViews.get(
      context.dataSourceSelection.toDataviewSpec().id,
      false
    );
    if (nextDataView.id) {
      await discoverStateContainer.actions.onChangeDataView(nextDataView);
    }
    discoverStateContainer.actions.setDataView(nextDataView);
  };
