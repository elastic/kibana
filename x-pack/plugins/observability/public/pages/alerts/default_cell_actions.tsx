/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ObservabilityPublicPluginsStart } from '../..';
import { getMappedNonEcsValue } from './render_cell_value';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { TimelineNonEcsData } from '../../../../timelines/common/search_strategy';
import { TGridCellAction } from '../../../../timelines/common/types/timeline';
import { TimelinesUIStart } from '../../../../timelines/public';

/** a noop required by the filter in / out buttons */
const onFilterAdded = () => {};

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

/** actions for adding filters to the search bar */
const filterCellActions: TGridCellAction[] = [
  ({ data }: { data: TimelineNonEcsData[][] }) => ({ rowIndex, columnId, Component }) => {
    const { timelines, filterManager } = useKibanaServices();

    const value = getMappedNonEcsValue({
      data: data[rowIndex],
      fieldName: columnId,
    });

    return (
      <>
        {timelines.getHoverActions().getFilterForValueButton({
          Component,
          field: columnId,
          filterManager,
          onFilterAdded,
          ownFocus: false,
          showTooltip: false,
          value,
        })}
      </>
    );
  },
  ({ data }: { data: TimelineNonEcsData[][] }) => ({ rowIndex, columnId, Component }) => {
    const { timelines, filterManager } = useKibanaServices();

    const value = getMappedNonEcsValue({
      data: data[rowIndex],
      fieldName: columnId,
    });

    return (
      <>
        {timelines.getHoverActions().getFilterOutValueButton({
          Component,
          field: columnId,
          filterManager,
          onFilterAdded,
          ownFocus: false,
          showTooltip: false,
          value,
        })}
      </>
    );
  },
];

/** actions common to all cells (e.g. copy to clipboard) */
const commonCellActions: TGridCellAction[] = [
  ({ data }: { data: TimelineNonEcsData[][] }) => ({ rowIndex, columnId, Component }) => {
    const { timelines } = useKibanaServices();

    const value = getMappedNonEcsValue({
      data: data[rowIndex],
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

/** returns the default actions shown in `EuiDataGrid` cells */
export const getDefaultCellActions = ({ enableFilterActions }: { enableFilterActions: boolean }) =>
  enableFilterActions ? [...filterCellActions, ...commonCellActions] : [...commonCellActions];
