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
import { EmptyComponent, useKibanaServices } from './helpers';

export const getCopyCellAction = ({
  data,
  pageSize,
}: {
  data?: TimelineNonEcsData[][];
  pageSize: number;
}) =>
  data && data.length > 0
    ? function CopyButton({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) {
        const { timelines } = useKibanaServices();

        const pageRowIndex = getPageRowIndex(rowIndex, pageSize);

        const copyButton = useMemo(() => timelines.getHoverActions().getCopyButton, [timelines]);

        const rowData = useMemo(() => {
          return {
            data: data[pageRowIndex],
            fieldName: columnId,
          };
        }, [pageRowIndex, columnId]);

        const value = useGetMappedNonEcsValue(rowData);

        const copyButtonProps = useMemo(() => {
          return {
            Component,
            field: columnId,
            isHoverAction: false,
            ownFocus: false,
            showTooltip: false,
            value,
          };
        }, [Component, columnId, value]);

        // data grid expects each cell action always return an element, it crashes if returns null
        return pageRowIndex >= data.length ? (
          <>{EmptyComponent}</>
        ) : (
          <>{copyButton(copyButtonProps)}</>
        );
      }
    : EmptyComponent;
