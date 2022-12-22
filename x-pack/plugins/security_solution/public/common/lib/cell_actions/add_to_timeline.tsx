/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { useDispatch } from 'react-redux';
import type { TimelineNonEcsData } from '../../../../common/search_strategy';
import type { DataProvider } from '../../../../common/types';
import { TimelineId } from '../../../../common/types';
import { useGetMappedNonEcsValue } from '../../../timelines/components/timeline/body/data_driven_columns';
import {
  EXISTS_OPERATOR,
  IS_OPERATOR,
} from '../../../timelines/components/timeline/data_providers/data_provider';
import { escapeDataProviderId } from '../../components/drag_and_drop/helpers';
import { EmptyComponent, useKibanaServices } from './helpers';
import { addProvider } from '../../../timelines/store/timeline/actions';
import { getPageRowIndex } from '../../components/data_table/pagination';

export const getAddToTimelineCellAction = ({
  data,
  pageSize,
  closeCellPopover,
}: {
  data?: TimelineNonEcsData[][];
  pageSize: number;
  closeCellPopover?: () => void;
}) =>
  data && data.length > 0
    ? function AddToTimeline({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) {
        const dispatch = useDispatch();
        const { timelines } = useKibanaServices();
        const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
        const rowData = useMemo(() => {
          return {
            data: data[pageRowIndex],
            fieldName: columnId,
          };
        }, [pageRowIndex, columnId]);

        const value = useGetMappedNonEcsValue(rowData);

        const addToTimelineButton = useMemo(
          () => timelines.getHoverActions().getAddToTimelineButton,
          [timelines]
        );

        const dataProvider: DataProvider[] = useMemo(() => {
          const queryIdPrefix = `${escapeDataProviderId(columnId)}-row-${rowIndex}-col-${columnId}`;
          if (!value) {
            return [
              {
                and: [],
                enabled: true,
                kqlQuery: '',
                id: `${queryIdPrefix}`,
                name: '',
                excluded: true,
                queryMatch: {
                  field: columnId,
                  value: '',
                  operator: EXISTS_OPERATOR,
                },
              },
            ];
          }
          return value.map((x) => ({
            and: [],
            enabled: true,
            excluded: false,
            kqlQuery: '',
            id: `${queryIdPrefix}-val-${x}`,
            name: x,
            queryMatch: {
              field: columnId,
              value: x,
              operator: IS_OPERATOR,
            },
          }));
        }, [columnId, rowIndex, value]);

        /*
         *   Add to Timeline button, adds data to dataprovider but does not persists the Timeline
         *   to the server because of following reasons.
         *
         *   1. Add to Timeline button performs actions in `timelines` plugin
         *   2. `timelines` plugin does not have information on how to create/update the timelines in the server
         *       as it is owned by Security Solution
         * */
        const handleAddToTimelineAction = useCallback(() => {
          dispatch(
            addProvider({
              id: TimelineId.active,
              providers: dataProvider,
            })
          );
          if (closeCellPopover) {
            closeCellPopover();
          }
        }, [dataProvider, dispatch]);

        const addToTimelineProps = useMemo(() => {
          return {
            Component,
            dataProvider,
            field: columnId,
            ownFocus: false,
            showTooltip: false,
            onClick: handleAddToTimelineAction,
            timelineType: 'default',
          };
        }, [Component, columnId, dataProvider, handleAddToTimelineAction]);

        // data grid expects each cell action always return an element, it crashes if returns null
        return pageRowIndex >= data.length ? (
          <>{EmptyComponent}</>
        ) : (
          <>{addToTimelineButton(addToTimelineProps)}</>
        );
      }
    : EmptyComponent;
