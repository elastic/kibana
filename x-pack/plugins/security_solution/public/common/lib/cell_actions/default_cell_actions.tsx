/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { head, getOr, get, isEmpty } from 'lodash/fp';
import React, { useMemo } from 'react';

import type {
  BrowserFields,
  TimelineNonEcsData,
} from '../../../../../timelines/common/search_strategy';
import {
  ColumnHeaderOptions,
  DataProvider,
  TGridCellAction,
} from '../../../../../timelines/common/types';
import { getPageRowIndex } from '../../../../../timelines/public';
import { Ecs } from '../../../../common/ecs';
import { getMappedNonEcsValue } from '../../../timelines/components/timeline/body/data_driven_columns';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { parseValue } from '../../../timelines/components/timeline/body/renderers/parse_value';
import { IS_OPERATOR } from '../../../timelines/components/timeline/data_providers/data_provider';
import { escapeDataProviderId } from '../../components/drag_and_drop/helpers';
import { useKibana } from '../kibana';
import { getLink } from './helpers';

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

export const EmptyComponent = () => <></>;

const cellActionLink = [
  ({
    browserFields,
    data,
    ecsData,
    header,
    timelineId,
    pageSize,
  }: {
    browserFields: BrowserFields;
    data: TimelineNonEcsData[][];
    ecsData: Ecs[];
    header?: ColumnHeaderOptions;
    timelineId: string;
    pageSize: number;
  }) => {
    return getLink(header?.id, header?.type, header?.linkField)
      ? ({ rowIndex, columnId, Component, closePopover }: EuiDataGridColumnCellActionProps) => {
          const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
          const ecs = pageRowIndex < ecsData.length ? ecsData[pageRowIndex] : null;
          const link = getLink(columnId, header?.type, header?.linkField);
          const linkField = header?.linkField ? header?.linkField : link?.linkField;
          const linkValues = header && getOr([], linkField ?? '', ecs);
          const eventId = header && get('_id' ?? '', ecs);
          if (pageRowIndex >= data.length) {
            // data grid expects each cell action always return an element, it crashes if returns null
            return <></>;
          }

          const values = getMappedNonEcsValue({
            data: data[pageRowIndex],
            fieldName: columnId,
          });

          const value = parseValue(head(values));
          return link && eventId && values && !isEmpty(value) ? (
            <FormattedFieldValue
              Component={Component}
              contextId={`expanded-value-${columnId}-row-${pageRowIndex}-${timelineId}`}
              eventId={eventId}
              fieldFormat={header?.format || ''}
              fieldName={columnId}
              fieldType={header?.type || ''}
              isButton={true}
              isDraggable={false}
              value={value}
              truncate={false}
              title={values.length > 1 ? `${link?.label}: ${value}` : link?.label}
              linkValue={head(linkValues)}
              onClick={closePopover}
            />
          ) : (
            // data grid expects each cell action always return an element, it crashes if returns null
            <></>
          );
        }
      : EmptyComponent;
  },
];

export const cellActions: TGridCellAction[] = [
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) =>
    ({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) => {
      const { timelines, filterManager } = useKibanaServices();

      const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
      if (pageRowIndex >= data.length) {
        // data grid expects each cell action always return an element, it crashes if returns null
        return <></>;
      }

      const value = getMappedNonEcsValue({
        data: data[pageRowIndex],
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
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) =>
    ({ rowIndex, columnId, Component }) => {
      const { timelines, filterManager } = useKibanaServices();

      const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
      if (pageRowIndex >= data.length) {
        // data grid expects each cell action always return an element, it crashes if returns null
        return <></>;
      }

      const value = getMappedNonEcsValue({
        data: data[pageRowIndex],
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
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) =>
    ({ rowIndex, columnId, Component }) => {
      const { timelines } = useKibanaServices();

      const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
      if (pageRowIndex >= data.length) {
        // data grid expects each cell action always return an element, it crashes if returns null
        return <></>;
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
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) =>
    ({ rowIndex, columnId, Component }) => {
      const { timelines } = useKibanaServices();

      const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
      if (pageRowIndex >= data.length) {
        // data grid expects each cell action always return an element, it crashes if returns null
        return <></>;
      }

      const value = getMappedNonEcsValue({
        data: data[pageRowIndex],
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

/** the default actions shown in `EuiDataGrid` cells */
export const defaultCellActions = [...cellActions, ...cellActionLink];
