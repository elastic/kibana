/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import { EuiButtonIcon } from '@elastic/eui';
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

export const FILTER_FOR_VALUE = 'filter for value';

const myFilterCellActions: TGridCellAction[] = [
  ({ data }: { data: TimelineNonEcsData[][] }) => ({ Component }) =>
    Component ? (
      <Component
        aria-label="title"
        data-test-subj="filter-for-value"
        iconType="plusInCircle"
        onClick={() => alert('aa')}
        title={FILTER_FOR_VALUE}
      >
        {FILTER_FOR_VALUE}
      </Component>
    ) : (
      <EuiButtonIcon
        aria-label="test"
        className="timelines__hoverActionButton"
        data-test-subj="filter-for-value"
        iconSize="s"
        iconType="plusInCircle"
        onClick={() => alert('aa')}
      />
    ),
];

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
// export const getDefaultCellActions = ({
//   enableFilterActions,
//   addToQuery,
// }: {
//   enableFilterActions: boolean;
//   addToQuery: (value: string) => void;
// }) => {
//   const cellActions = enableFilterActions
//     ? [...myFilterCellActions(addToQuery), ...commonCellActions]
//     : [...commonCellActions];
//   return cellActions;
// };

// return an array of functions
//
const buildFilterCellActions = (addToQuery: (value: string) => void): TGridCellAction[] => [
  ({ data }: { data: TimelineNonEcsData[][] }) => ({ rowIndex, columnId, Component, ...rest }) => {
    const value = getMappedNonEcsValue({
      data: data[rowIndex],
      fieldName: columnId,
    });
    const text = useMemo(() => `${columnId}${value != null ? `: "${value}"` : ''}`, [
      columnId,
      value,
    ]);
    const onClick = useCallback(() => {
      addToQuery(text);
    }, [text]);

    return Component ? (
      <Component
        aria-label="title"
        data-test-subj="filter-for-value"
        iconType="plusInCircle"
        onClick={onClick}
        title={FILTER_FOR_VALUE}
      >
        {FILTER_FOR_VALUE}
      </Component>
    ) : (
      <EuiButtonIcon
        aria-label="test"
        className="timelines__hoverActionButton"
        data-test-subj="filter-for-value"
        iconSize="s"
        iconType="plusInCircle"
        onClick={addToQuery}
      />
    );
  },
];

export const getDefaultCellActions = ({
  enableFilterActions,
  addToQuery,
}: {
  enableFilterActions: boolean;
  addToQuery: (value: string) => void;
}) => {
  const cellActions = enableFilterActions
    ? [...buildFilterCellActions(addToQuery), ...commonCellActions, ...filterCellActions]
    : [...commonCellActions];
  return cellActions;
};
