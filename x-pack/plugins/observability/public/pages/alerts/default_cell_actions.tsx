/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiButtonIcon } from '@elastic/eui';
import { ObservabilityPublicPluginsStart } from '../..';
import { getMappedNonEcsValue } from './render_cell_value';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { TimelineNonEcsData } from '../../../../timelines/common/search_strategy';
import { TGridCellAction } from '../../../../timelines/common/types/timeline';
import { TimelinesUIStart } from '../../../../timelines/public';

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

/** actions for adding filters to the search bar */
const buildFilterCellActions = (addToQuery: (value: string) => void): TGridCellAction[] => [
  ({ data }: { data: TimelineNonEcsData[][] }) => ({ rowIndex, columnId, Component }) => {
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
        aria-label={FILTER_FOR_VALUE}
        data-test-subj="filter-for-value"
        iconType="plusInCircle"
        onClick={onClick}
        title={FILTER_FOR_VALUE}
      >
        {FILTER_FOR_VALUE}
      </Component>
    ) : (
      <EuiButtonIcon
        aria-label={FILTER_FOR_VALUE}
        className="timelines__hoverActionButton"
        data-test-subj="filter-for-value"
        iconSize="s"
        iconType="plusInCircle"
        onClick={onClick}
      />
    );
  },
];

/** returns the default actions shown in `EuiDataGrid` cells */
export const getDefaultCellActions = ({
  enableFilterActions,
  addToQuery,
}: {
  enableFilterActions: boolean;
  addToQuery: (value: string) => void;
}) => {
  const cellActions = enableFilterActions
    ? [...buildFilterCellActions(addToQuery), ...commonCellActions]
    : [...commonCellActions];
  return cellActions;
};
