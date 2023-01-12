/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import React, { useMemo } from 'react';

import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common/search_strategy';
import { useGetMappedNonEcsValue } from '../../../timelines/components/timeline/body/data_driven_columns';
import { EmptyComponent, onFilterAdded, useKibanaServices } from './helpers';
import { getPageRowIndex } from '../../components/data_table/pagination';

export const getFilterOutCellAction = ({
  data,
  pageSize,
  closeCellPopover,
}: {
  data?: TimelineNonEcsData[][];
  pageSize: number;
  closeCellPopover?: () => void;
}) =>
  data && data.length > 0
    ? function FilterOut({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) {
        const { timelines, filterManager } = useKibanaServices();
        const pageRowIndex = getPageRowIndex(rowIndex, pageSize);

        const rowData = useMemo(() => {
          return {
            data: data[pageRowIndex],
            fieldName: columnId,
          };
        }, [pageRowIndex, columnId]);

        const value = useGetMappedNonEcsValue(rowData);

        const filterOutButton = useMemo(
          () => timelines.getHoverActions().getFilterOutValueButton,
          [timelines]
        );

        const filterOutProps = useMemo(() => {
          return {
            Component,
            field: columnId,
            filterManager,
            onFilterAdded,
            ownFocus: false,
            showTooltip: false,
            value,
            onClick: closeCellPopover,
          };
        }, [Component, columnId, filterManager, value]);

        // data grid expects each cell action always return an element, it crashes if returns null
        return pageRowIndex >= data.length ? (
          <>{EmptyComponent}</>
        ) : (
          <>{filterOutButton(filterOutProps)}</>
        );
      }
    : EmptyComponent;
