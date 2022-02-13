/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { head, getOr, get, isEmpty } from 'lodash/fp';
import React, { useMemo } from 'react';

import type { TimelineNonEcsData } from '../../../../../timelines/common/search_strategy';
import {
  ColumnHeaderOptions,
  DataProvider,
  TGridCellAction,
} from '../../../../../timelines/common/types';
import { getPageRowIndex } from '../../../../../timelines/public';
import { Ecs } from '../../../../common/ecs';
import { useGetMappedNonEcsValue } from '../../../timelines/components/timeline/body/data_driven_columns';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { parseValue } from '../../../timelines/components/timeline/body/renderers/parse_value';
import { IS_OPERATOR } from '../../../timelines/components/timeline/data_providers/data_provider';
import { escapeDataProviderId } from '../../components/drag_and_drop/helpers';
import { useKibana } from '../kibana';
import { getLinkColumnDefinition } from './helpers';
import { getField, getFieldKey } from '../../../helpers';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';

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

const useFormattedFieldProps = ({
  rowIndex,
  pageSize,
  ecsData,
  columnId,
  header,
  data,
}: {
  rowIndex: number;
  data: TimelineNonEcsData[][];
  ecsData: Ecs[];
  header?: ColumnHeaderOptions;
  columnId: string;
  pageSize: number;
}) => {
  const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
  const usersEnabled = useIsExperimentalFeatureEnabled('usersEnabled');
  const ecs = ecsData[pageRowIndex];
  const link = getLinkColumnDefinition(columnId, header?.type, header?.linkField, usersEnabled);
  const linkField = header?.linkField ? header?.linkField : link?.linkField;
  const linkValues = header && getOr([], linkField ?? '', ecs);
  const eventId = (header && get('_id' ?? '', ecs)) || '';
  const rowData = useMemo(() => {
    return {
      data: data[pageRowIndex],
      fieldName: columnId,
    };
  }, [pageRowIndex, columnId, data]);

  const values = useGetMappedNonEcsValue(rowData);
  const value = parseValue(head(values));
  const title = values && values.length > 1 ? `${link?.label}: ${value}` : link?.label;
  // if linkField is defined but link values is empty, it's possible we are trying to look for a column definition for an old event set
  if (linkField !== undefined && linkValues.length === 0 && values !== undefined) {
    const normalizedLinkValue = getField(ecs, linkField);
    const normalizedLinkField = getFieldKey(ecs, linkField);
    const normalizedColumnId = getFieldKey(ecs, columnId);
    const normalizedLink = getLinkColumnDefinition(
      normalizedColumnId,
      header?.type,
      normalizedLinkField,
      usersEnabled
    );
    return {
      pageRowIndex,
      link: normalizedLink,
      eventId,
      fieldFormat: header?.format || '',
      fieldName: normalizedColumnId,
      fieldType: header?.type || '',
      value: parseValue(head(normalizedColumnId)),
      values,
      title,
      linkValue: head<string>(normalizedLinkValue),
    };
  } else {
    return {
      pageRowIndex,
      link,
      eventId,
      fieldFormat: header?.format || '',
      fieldName: columnId,
      fieldType: header?.type || '',
      value,
      values,
      title,
      linkValue: head<string>(linkValues),
    };
  }
};

export const cellActions: TGridCellAction[] = [
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) =>
    function FilterFor({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) {
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
      if (pageRowIndex >= data.length) {
        // data grid expects each cell action always return an element, it crashes if returns null
        return <></>;
      }

      return <>{filterForButton(filterForProps)}</>;
    },
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) =>
    function FilterOut({ rowIndex, columnId, Component }) {
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
        };
      }, [Component, columnId, filterManager, value]);
      if (pageRowIndex >= data.length) {
        // data grid expects each cell action always return an element, it crashes if returns null
        return <></>;
      }

      return <>{filterOutButton(filterOutProps)}</>;
    },
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) =>
    function AddToTimeline({ rowIndex, columnId, Component }) {
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
      const addToTimelineProps = useMemo(() => {
        return {
          Component,
          dataProvider,
          field: columnId,
          ownFocus: false,
          showTooltip: false,
        };
      }, [Component, columnId, dataProvider]);
      if (pageRowIndex >= data.length) {
        // data grid expects each cell action always return an element, it crashes if returns null
        return <></>;
      }

      return <>{addToTimelineButton(addToTimelineProps)}</>;
    },
  ({ data, pageSize }: { data: TimelineNonEcsData[][]; pageSize: number }) =>
    function CopyButton({ rowIndex, columnId, Component }) {
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
      if (pageRowIndex >= data.length) {
        // data grid expects each cell action always return an element, it crashes if returns null
        return <></>;
      }

      return <>{copyButton(copyButtonProps)}</>;
    },
  ({
    data,
    ecsData,
    header,
    timelineId,
    pageSize,
  }: {
    data: TimelineNonEcsData[][];
    ecsData: Ecs[];
    header?: ColumnHeaderOptions;
    timelineId: string;
    pageSize: number;
  }) => {
    if (header !== undefined) {
      return function FieldValue({
        rowIndex,
        columnId,
        Component,
        closePopover,
      }: EuiDataGridColumnCellActionProps) {
        const {
          pageRowIndex,
          link,
          eventId,
          value,
          values,
          title,
          fieldName,
          fieldFormat,
          fieldType,
          linkValue,
        } = useFormattedFieldProps({ rowIndex, pageSize, ecsData, columnId, header, data });

        const showEmpty = useMemo(() => {
          const hasLink = link !== undefined && values && !isEmpty(value);
          if (pageRowIndex >= data.length) {
            return true;
          } else {
            return hasLink !== true;
          }
        }, [link, pageRowIndex, value, values]);

        return showEmpty === false ? (
          <FormattedFieldValue
            Component={Component}
            contextId={`expanded-value-${columnId}-row-${pageRowIndex}-${timelineId}`}
            eventId={eventId}
            fieldFormat={fieldFormat}
            fieldName={fieldName}
            fieldType={fieldType}
            isButton={true}
            isDraggable={false}
            value={value}
            truncate={false}
            title={title}
            linkValue={linkValue}
            onClick={closePopover}
          />
        ) : (
          // data grid expects each cell action always return an element, it crashes if returns null
          <></>
        );
      };
    } else {
      return EmptyComponent;
    }
  },
];

/** the default actions shown in `EuiDataGrid` cells */
export const defaultCellActions = [...cellActions];
