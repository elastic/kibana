/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { head, getOr, get } from 'lodash/fp';
import React, { useCallback, useState, useMemo } from 'react';
import { Filter } from '../../../../../../../src/plugins/data/public';

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
import { INDICATOR_REFERENCE } from '../../../../common/cti/constants';
import { Ecs } from '../../../../common/ecs';
import { IP_FIELD_TYPE } from '../../../network/components/ip';
import { PORT_NAMES } from '../../../network/components/port';
import { getMappedNonEcsValue } from '../../../timelines/components/timeline/body/data_driven_columns';
import {
  EVENT_URL_FIELD_NAME,
  HOST_NAME_FIELD_NAME,
  REFERENCE_URL_FIELD_NAME,
  RULE_REFERENCE_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { parseValue } from '../../../timelines/components/timeline/body/renderers/parse_value';
import { IS_OPERATOR } from '../../../timelines/components/timeline/data_providers/data_provider';
import { allowTopN, escapeDataProviderId } from '../../components/drag_and_drop/helpers';
import { ShowTopNButton } from '../../components/hover_actions/actions/show_top_n';
import { getAllFieldsByName } from '../../containers/source';
import { useKibana } from '../kibana';

const COLUMNS_WITH_LINKS = [
  {
    columnId: HOST_NAME_FIELD_NAME,
    label: 'View host summary',
  },
  {
    fieldType: IP_FIELD_TYPE,
    label: 'Expand ip details',
  },
  {
    columnId: SIGNAL_RULE_NAME_FIELD_NAME,
    label: 'View rule details',
  },
  ...PORT_NAMES.map((p) => ({
    columnId: p,
    label: 'View port details',
  })),
  {
    columnId: RULE_REFERENCE_FIELD_NAME,
    label: 'View rule reference',
  },
  {
    columnId: REFERENCE_URL_FIELD_NAME,
    label: 'View rule reference',
  },
  {
    columnId: EVENT_URL_FIELD_NAME,
    label: 'View even reference',
  },
  {
    columnId: INDICATOR_REFERENCE,
    label: 'View indicator reference',
  },
];

const getLink = (cId?: string, fieldType?: string) => {
  return (
    cId &&
    COLUMNS_WITH_LINKS.find((c) => c.columnId === cId || (fieldType && c.fieldType === fieldType))
  );
};

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

export const cellActionTopN = [
  ({
      browserFields,
      data,
      globalFilters,
      timelineId,
      pageSize,
    }: {
      browserFields: BrowserFields;
      data: TimelineNonEcsData[][];
      globalFilters?: Filter[];
      timelineId: string;
      pageSize: number;
    }) =>
    ({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) => {
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

      const showButton = useMemo(
        () =>
          allowTopN({
            browserField: getAllFieldsByName(browserFields)[columnId],
            fieldName: columnId,
            hideTopN: false,
          }),
        [columnId]
      );

      return showButton ? (
        <ShowTopNButton
          Component={Component}
          enablePopOver
          data-test-subj="hover-actions-show-top-n"
          field={columnId}
          globalFilters={globalFilters}
          onClick={onClick}
          onFilterAdded={onFilterAdded}
          ownFocus={false}
          showTopN={showTopN}
          showTooltip={false}
          timelineId={timelineId}
          value={value}
        />
      ) : null;
    },
];

export const cellActionLink = [
  ({
      browserFields,
      data,
      ecsData,
      globalFilters,
      header,
      timelineId,
      pageSize,
    }: {
      browserFields: BrowserFields;
      data: TimelineNonEcsData[][];
      ecsData: Ecs[];
      globalFilters?: Filter[];
      header?: ColumnHeaderOptions;
      timelineId: string;
      pageSize: number;
    }) =>
    ({ rowIndex, columnId, Component, closePopover }: EuiDataGridColumnCellActionProps) => {
      const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
      const ecs = pageRowIndex < ecsData.length ? ecsData[pageRowIndex] : null;
      const linkValues = header && getOr([], header.linkField ?? '', ecs);
      const eventId = header && get('_id' ?? '', ecs);

      if (pageRowIndex >= data.length) {
        return null;
      }

      const values = getMappedNonEcsValue({
        data: data[pageRowIndex],
        fieldName: columnId,
      });

      const link = getLink(columnId, header?.type);

      return link && eventId
        ? values?.map((value, i) => (
            <FormattedFieldValue
              Component={Component}
              contextId={`expanded-value-${columnId}-row-${pageRowIndex}-${i}-${timelineId}`}
              eventId={eventId}
              fieldFormat={header?.format || ''}
              fieldName={columnId}
              fieldType={header?.type || ''}
              isButton={true}
              isDraggable={false}
              value={parseValue(value)}
              truncate={false}
              title={values.length > 1 ? `${link?.label}: ${value}` : link?.label}
              linkValue={head(linkValues)}
              onClick={closePopover}
            />
          ))
        : null;
    },
];

/** the default actions shown in `EuiDataGrid` cells */
export const defaultCellActions: TGridCellAction[] = [
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) =>
    ({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) => {
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
        return null;
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
        return null;
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

  ...cellActionTopN,
  ...cellActionLink,
];
