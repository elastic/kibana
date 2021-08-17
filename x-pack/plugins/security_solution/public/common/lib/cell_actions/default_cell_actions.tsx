/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useMemo } from 'react';

import type {
  BrowserFields,
  TimelineNonEcsData,
} from '../../../../../timelines/common/search_strategy';
import { DataProvider, TGridCellAction } from '../../../../../timelines/common/types';
import { TimelineId } from '../../../../common';
import { getMappedNonEcsValue } from '../../../timelines/components/timeline/body/data_driven_columns';
import { IS_OPERATOR } from '../../../timelines/components/timeline/data_providers/data_provider';
import { allowTopN, escapeDataProviderId } from '../../components/drag_and_drop/helpers';
import { ShowTopNButton } from '../../components/hover_actions/actions/show_top_n';
import { getAllFieldsByName } from '../../containers/source';
import { useKibana } from '../kibana';

/** a noop required by the filter in / out buttons */
const onFilterAdded = () => {};

/** a hook to eliminate the verbose boilerplate required to use common services */
const useKibanaServices = () => {
  const {
    timelines,
    data: {
      query: { filterManager },
    },
  } = useKibana().services;

  return { timelines, filterManager };
};

/** the default actions shown in `EuiDataGrid` cells */
export const defaultCellActions: TGridCellAction[] = [
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
  ({ data }: { data: TimelineNonEcsData[][] }) => ({ rowIndex, columnId, Component }) => {
    const { timelines } = useKibanaServices();

    const value = getMappedNonEcsValue({
      data: data[rowIndex],
      fieldName: columnId,
    });

    const dataProvider: DataProvider[] = useMemo(
      () =>
        value?.map((x) => ({
          and: [],
          enabled: true,
          id: `${escapeDataProviderId(columnId)}-row-${rowIndex}-col-${columnId}-val-${x}`,
          name: x,
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field: columnId,
            value: x,
            operator: IS_OPERATOR,
          },
        })) ?? [],
      [columnId, rowIndex, value]
    );

    return (
      <>
        {timelines.getHoverActions().getAddToTimelineButton({
          Component,
          dataProvider,
          field: columnId,
          ownFocus: false,
          showTooltip: false,
        })}
      </>
    );
  },
  ({ browserFields, data }: { browserFields: BrowserFields; data: TimelineNonEcsData[][] }) => ({
    rowIndex,
    columnId,
    Component,
  }) => {
    const [showTopN, setShowTopN] = useState(false);
    const onClick = useCallback(() => setShowTopN(!showTopN), [showTopN]);

    const value = getMappedNonEcsValue({
      data: data[rowIndex],
      fieldName: columnId,
    });

    return (
      <>
        {allowTopN({
          browserField: getAllFieldsByName(browserFields)[columnId],
          fieldName: columnId,
        }) && (
          <ShowTopNButton
            Component={Component}
            data-test-subj="hover-actions-show-top-n"
            field={columnId}
            onClick={onClick}
            onFilterAdded={onFilterAdded}
            ownFocus={false}
            showTopN={showTopN}
            showTooltip={false}
            timelineId={TimelineId.active}
            value={value}
          />
        )}
      </>
    );
  },
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
