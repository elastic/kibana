/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import React, { useMemo } from 'react';

import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common/search_strategy';
import { getPageRowIndex } from '@kbn/timelines-plugin/public';
import { useGetMappedNonEcsValue } from '../../../timelines/components/timeline/body/data_driven_columns';
import { EmptyComponent, onFilterAdded, useKibanaServices } from './helpers';

export const getFilterForCellAction = ({
  data,
  pageSize,
}: {
  data?: TimelineNonEcsData[][];
  pageSize: number;
}) =>
  data && data.length > 0
    ? function FilterFor({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) {
        const { timelines, filterManager } = useKibanaServices();

        const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
        const rowData = useMemo(() => {
          return {
            data: data[pageRowIndex],
            fieldName: columnId,
          };
        }, [pageRowIndex, columnId]);

        const value = useGetMappedNonEcsValue(rowData);
        const filterForButton = useMemo(
          () => timelines.getHoverActions().getFilterForValueButton,
          [timelines]
        );

        const filterForProps = useMemo(() => {
          return {
            Component,
            field: columnId,
            filterManager,
            onFilterAdded,
            ownFocus: false,
            showTooltip: false,
            value,
          };
        }, [Component, columnId, filterManager, value]);

        // data grid expects each cell action always return an element, it crashes if returns null
        return pageRowIndex >= data.length ? (
          <>{EmptyComponent}</>
        ) : (
          <>{filterForButton(filterForProps)}</>
        );
      }
    : EmptyComponent;
