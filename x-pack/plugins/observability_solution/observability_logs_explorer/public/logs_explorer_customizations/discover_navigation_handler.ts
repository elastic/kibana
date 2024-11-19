/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverStart } from '@kbn/discover-plugin/public';
import { isDataViewSelection } from '@kbn/logs-explorer-plugin/common';
import {
  getDiscoverColumnsWithFallbackFieldsFromDisplayOptions,
  LogsExplorerCustomizationEvents,
} from '@kbn/logs-explorer-plugin/public';

export const createOnUknownDataViewSelectionHandler = (
  discover: DiscoverStart
): LogsExplorerCustomizationEvents['onUknownDataViewSelection'] => {
  return (context) => {
    if (isDataViewSelection(context.dataSourceSelection))
      discover.locator?.navigate({
        breakdownField: context.chart.breakdownField ?? undefined,
        columns: getDiscoverColumnsWithFallbackFieldsFromDisplayOptions(context),
        dataViewSpec: context.dataSourceSelection.selection.dataView.toDataviewSpec(),
        filters: context.filters,
        query: context.query,
        refreshInterval: context.refreshInterval,
        timeRange: context.time,
      });
  };
};
