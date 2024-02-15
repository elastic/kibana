/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { head, getOr, get, isEmpty } from 'lodash/fp';
import React, { useMemo } from 'react';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { getPageRowIndex } from '@kbn/securitysolution-data-table';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { ColumnHeaderOptions } from '../../../../common/types';
import type { TimelineNonEcsData } from '../../../../common/search_strategy';
import { useGetMappedNonEcsValue } from '../../../timelines/components/timeline/body/data_driven_columns';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { parseValue } from '../../../timelines/components/timeline/body/renderers/parse_value';
import { EmptyComponent, getLinkColumnDefinition } from './helpers';
import { getField, getFieldKey } from '../../../helpers';

const useFormattedFieldProps = ({
  rowIndex,
  pageSize,
  ecsData,
  columnId,
  header,
  data,
  unifiedDataTableRow,
}: {
  rowIndex: number;
  data: TimelineNonEcsData[][];
  ecsData: Ecs[];
  header?: ColumnHeaderOptions;
  columnId: string;
  pageSize: number;
  unifiedDataTableRow?: DataTableRecord & TimelineItem;
}) => {
  const pageRowIndex = getPageRowIndex(rowIndex, pageSize);

  const rowData = useMemo(() => {
    return {
      data: unifiedDataTableRow ? unifiedDataTableRow.data : data[pageRowIndex],
      fieldName: columnId,
    };
  }, [pageRowIndex, columnId, data, unifiedDataTableRow]);
  const ecs = unifiedDataTableRow ? unifiedDataTableRow.ecs : ecsData[pageRowIndex];

  const link = getLinkColumnDefinition(columnId, header?.type, header?.linkField);
  const linkField = header?.linkField ? header?.linkField : link?.linkField;
  const linkValues = header && getOr([], linkField ?? '', ecs);
  const eventId = (header && get('_id' ?? '', ecs)) || '';
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
      normalizedLinkField
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

export const FieldValueCell = ({
  data,
  ecsData,
  header,
  scopeId,
  pageSize,
  closeCellPopover,
  unifiedDataTableRows,
}: {
  data: TimelineNonEcsData[][];
  ecsData: Ecs[];
  header?: ColumnHeaderOptions;
  scopeId: string;
  pageSize: number;
  closeCellPopover?: () => void;
  unifiedDataTableRows?: Array<DataTableRecord & TimelineItem>;
}) => {
  if (header !== undefined) {
    return function FieldValue({
      rowIndex,
      columnId,
      Component,
    }: EuiDataGridColumnCellActionProps) {
      const unifiedDataTableRow = unifiedDataTableRows ? unifiedDataTableRows[rowIndex] : undefined;
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
      } = useFormattedFieldProps({
        unifiedDataTableRow,
        rowIndex,
        pageSize,
        ecsData,
        columnId,
        header,
        data,
      });

      const showEmpty = useMemo(() => {
        const hasLink = link !== undefined && values && !isEmpty(value);
        if (unifiedDataTableRow) {
          return hasLink !== true;
        }
        if (pageRowIndex >= data.length) {
          return true;
        } else {
          return hasLink !== true;
        }
      }, [link, pageRowIndex, value, values, unifiedDataTableRow]);

      return showEmpty === false ? (
        <FormattedFieldValue
          Component={unifiedDataTableRow ? undefined : Component}
          contextId={`expanded-value-${columnId}-row-${pageRowIndex}-${scopeId}`}
          eventId={eventId}
          fieldFormat={fieldFormat}
          isAggregatable={header?.aggregatable ?? false}
          fieldName={fieldName}
          fieldType={fieldType}
          isButton={unifiedDataTableRow ? false : true}
          isDraggable={false}
          value={value}
          truncate={false}
          title={title}
          linkValue={linkValue}
          onClick={closeCellPopover}
        />
      ) : (
        // data grid expects each cell action always return an element, it crashes if returns null
        EmptyComponent
      );
    };
  } else {
    return EmptyComponent;
  }
};
