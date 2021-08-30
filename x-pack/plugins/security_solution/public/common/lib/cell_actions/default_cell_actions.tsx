/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useMemo } from 'react';
import styled from 'styled-components';

import type {
  BrowserFields,
  TimelineNonEcsData,
} from '../../../../../timelines/common/search_strategy';
import { DataProvider, TGridCellAction } from '../../../../../timelines/common/types';
import { getPageRowIndex } from '../../../../../timelines/public';
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

const EuiActionContainer = styled.div`
  span.euiButtonEmpty__text {
    display: none;
  }
`;

/** the default actions shown in `EuiDataGrid` cells */
export const defaultCellActions: TGridCellAction[] = [
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) => ({
    rowIndex,
    columnId,
    Component,
  }) => {
    const { timelines, filterManager } = useKibanaServices();

    const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
    if (pageRowIndex >= data.length) {
      return null;
    }

    const value = getMappedNonEcsValue({
      data: data[pageRowIndex],
      fieldName: columnId,
    });

    return (
      <EuiActionContainer>
        {timelines.getHoverActions().getFilterForValueButton({
          Component,
          field: columnId,
          filterManager,
          onFilterAdded,
          ownFocus: false,
          showTooltip: true,
          value,
        })}
      </EuiActionContainer>
    );
  },
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) => ({
    rowIndex,
    columnId,
    Component,
  }) => {
    const { timelines, filterManager } = useKibanaServices();

    const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
    if (pageRowIndex >= data.length) {
      return null;
    }

    const value = getMappedNonEcsValue({
      data: data[pageRowIndex],
      fieldName: columnId,
    });

    return (
      <EuiActionContainer>
        {timelines.getHoverActions().getFilterOutValueButton({
          Component,
          field: columnId,
          filterManager,
          onFilterAdded,
          ownFocus: false,
          showTooltip: true,
          value,
        })}
      </EuiActionContainer>
    );
  },
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) => ({
    rowIndex,
    columnId,
    Component,
  }) => {
    const { timelines } = useKibanaServices();

    const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
    if (pageRowIndex >= data.length) {
      return null;
    }

    const value = getMappedNonEcsValue({
      data: data[pageRowIndex],
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
      <EuiActionContainer>
        {timelines.getHoverActions().getAddToTimelineButton({
          Component,
          dataProvider,
          field: columnId,
          ownFocus: false,
          showTooltip: true,
        })}
      </EuiActionContainer>
    );
  },
  ({
    browserFields,
    data,
    timelineId,
    pageSize,
  }: {
    browserFields: BrowserFields;
    data: TimelineNonEcsData[][];
    timelineId: string;
    pageSize: number;
  }) => ({ rowIndex, columnId, Component }) => {
    const [showTopN, setShowTopN] = useState(false);
    const onClick = useCallback(() => setShowTopN(!showTopN), [showTopN]);

    const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
    if (pageRowIndex >= data.length) {
      return null;
    }

    const value = getMappedNonEcsValue({
      data: data[pageRowIndex],
      fieldName: columnId,
    });

    return (
      <EuiActionContainer>
        <ShowTopNButton
          Component={Component}
          enablePopOver
          data-test-subj="hover-actions-show-top-n"
          field={columnId}
          onClick={onClick}
          onFilterAdded={onFilterAdded}
          ownFocus={false}
          showTopN={showTopN}
          showTooltip={true}
          timelineId={timelineId}
          value={value}
          disabled={!allowTopN({
            browserField: getAllFieldsByName(browserFields)[columnId],
            fieldName: columnId,
            hideTopN: false,
          })}
        />
      </EuiActionContainer>
    );
  },
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) => ({
    rowIndex,
    columnId,
    Component,
  }) => {
    const { timelines } = useKibanaServices();

    const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
    if (pageRowIndex >= data.length) {
      return null;
    }

    const value = getMappedNonEcsValue({
      data: data[pageRowIndex],
      fieldName: columnId,
    });

    return (
      <EuiActionContainer>
        {timelines.getHoverActions().getCopyButton({
          Component,
          field: columnId,
          isHoverAction: false,
          ownFocus: false,
          showTooltip: true,
          value,
        })}
      </EuiActionContainer>
    );
  },
];
