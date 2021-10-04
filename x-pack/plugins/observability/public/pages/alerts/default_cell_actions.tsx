/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ObservabilityPublicPluginsStart } from '../..';
import { getMappedNonEcsValue } from './render_cell_value';
import FilterForValueButton from './filter_for_value';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { TimelineNonEcsData } from '../../../../timelines/common/search_strategy';
import { TGridCellAction } from '../../../../timelines/common/types/timeline';
import { getPageRowIndex, TimelinesUIStart } from '../../../../timelines/public';

export const FILTER_FOR_VALUE = i18n.translate('xpack.observability.hoverActions.filterForValue', {
  defaultMessage: 'Filter for value',
});

/** a hook to eliminate the verbose boilerplate required to use common services */
const useKibanaServices = () => {
  const { timelines } = useKibana<{ timelines: TimelinesUIStart }>().services;
  const {
    services: {
      data: {
        query: { filterManager },
      },
    },
  } = useKibana<ObservabilityPublicPluginsStart>();

  return { timelines, filterManager };
};

/** actions common to all cells (e.g. copy to clipboard) */
const commonCellActions: TGridCellAction[] = [
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) =>
    ({ rowIndex, columnId, Component }) => {
      const { timelines } = useKibanaServices();

      const value = getMappedNonEcsValue({
        data: data[getPageRowIndex(rowIndex, pageSize)],
        fieldName: columnId,
      });

      return (
        <>
          {timelines.getHoverActions().getCopyButton({
            Component,
            field: columnId,
            isHoverAction: false,
            ownFocus: false,
            showTooltip: false,
            value,
          })}
        </>
      );
    },
];

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
export const getDefaultCellActions = ({ addToQuery }: { addToQuery: (value: string) => void }) => [
  ...buildFilterCellActions(addToQuery),
  ...commonCellActions,
];
