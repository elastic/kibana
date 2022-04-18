/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { TimelineNonEcsData } from '@kbn/timelines-plugin/common/search_strategy';
import { TGridCellAction } from '@kbn/timelines-plugin/common/types/timeline';
import { getPageRowIndex } from '@kbn/timelines-plugin/public';
import FilterForValueButton from './filter_for_value';
import { getMappedNonEcsValue } from './render_cell_value';

export const FILTER_FOR_VALUE = i18n.translate('xpack.observability.hoverActions.filterForValue', {
  defaultMessage: 'Filter for value',
});

/** actions for adding filters to the search bar */
const buildFilterCellActions = (addToQuery: (value: string) => void): TGridCellAction[] => [
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) =>
    ({ rowIndex, columnId, Component }) => {
      const value = getMappedNonEcsValue({
        data: data[getPageRowIndex(rowIndex, pageSize)],
        fieldName: columnId,
      });

      return (
        <FilterForValueButton
          Component={Component}
          field={columnId}
          value={value}
          addToQuery={addToQuery}
        />
      );
    },
];

/** returns the default actions shown in `EuiDataGrid` cells */
export const getDefaultCellActions = ({ addToQuery }: { addToQuery: (value: string) => void }) =>
  buildFilterCellActions(addToQuery);
