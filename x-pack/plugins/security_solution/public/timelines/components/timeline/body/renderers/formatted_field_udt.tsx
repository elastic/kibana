/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import type { EuiButtonEmpty, EuiButtonIcon, EuiDataGridCellValueElementProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { head, getOr, get, isEmpty, isNumber } from 'lodash/fp';
import React, { useMemo } from 'react';

import type { BrowserField, ColumnHeaderOptions, TimelineItem } from '@kbn/timelines-plugin/common';
import {} from '@kbn/timelines-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { EndpointAgentStatusById } from '../../../../../common/components/endpoint/endpoint_agent_status';
import { INDICATOR_REFERENCE } from '../../../../../../common/cti/constants';
import { Bytes, BYTES_FORMAT } from './bytes';
import { Duration, EVENT_DURATION_FIELD_NAME } from '../../../duration';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import { FormattedIp } from '../../../formatted_ip';
import { Port } from '../../../../../explore/network/components/port';
import { PORT_NAMES } from '../../../../../explore/network/components/port/helpers';
import { TruncatableText } from '../../../../../common/components/truncatable_text';
import {
  DATE_FIELD_TYPE,
  HOST_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
  IP_FIELD_TYPE,
  MESSAGE_FIELD_NAME,
  EVENT_MODULE_FIELD_NAME,
  RULE_REFERENCE_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
  REFERENCE_URL_FIELD_NAME,
  EVENT_URL_FIELD_NAME,
  SIGNAL_STATUS_FIELD_NAME,
  AGENT_STATUS_FIELD_NAME,
  GEO_FIELD_TYPE,
} from './constants';
import { RenderRuleName, renderEventModule, renderUrl } from './formatted_field_helpers';
import { RuleStatus } from './rule_status';
import { HostName } from './host_name';
import { UserName } from './user_name';
import {
  EmptyComponent,
  getLinkColumnDefinition,
} from '../../../../../common/lib/cell_actions/helpers';
import { useGetMappedNonEcsValue } from '../data_driven_columns';
import { parseValue } from './parse_value';
import { getField, getFieldKey } from '../../../../../helpers';

// simple black-list to prevent dragging and dropping fields such as message name
const columnNamesNotDraggable = [MESSAGE_FIELD_NAME];

export const useFormattedFieldProps = ({
  dataTableRow,
  columnId,
  header,
}: {
  dataTableRow: DataTableRecord & TimelineItem;
  header?: ColumnHeaderOptions;
  columnId: string;
}) => {
  const ecs = dataTableRow.ecs;
  const link = getLinkColumnDefinition(columnId, header?.type, header?.linkField);
  const linkField = header?.linkField ? header?.linkField : link?.linkField;
  const linkValues = header && getOr([], linkField ?? '', ecs);
  const eventId = (header && get('_id' ?? '', ecs)) || '';
  const rowData = useMemo(() => {
    return {
      data: dataTableRow,
      fieldName: columnId,
    };
  }, [columnId, dataTableRow]);

  const values = useGetMappedNonEcsValue({ data: rowData.data.data, fieldName: rowData.fieldName });
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

const FieldValueCell = (
  dataTableRows: Array<DataTableRecord & TimelineItem>,
  scopeId: string,
  browserFieldsByName: { [fieldName: string]: Partial<BrowserField> },
  closeCellPopover?: () => void
) => {
  return function FieldValue(props: EuiDataGridCellValueElementProps) {
    const header = browserFieldsByName[props.columnId] as ColumnHeaderOptions;
    const { link, eventId, value, values, title, fieldName, fieldFormat, fieldType, linkValue } =
      useFormattedFieldProps({
        dataTableRow: dataTableRows[props.rowIndex],
        columnId: props.columnId,
        header,
      });

    const showEmpty = useMemo(() => {
      const hasLink = link !== undefined && values && !isEmpty(value);
      return hasLink !== true;
    }, [link, value, values]);

    return (header.linkField && showEmpty === false) || !header.linkField ? (
      <FormattedFieldValue
        contextId={`expanded-value-${props.columnId}-row-${props.rowIndex}-${scopeId}`}
        eventId={eventId}
        fieldFormat={fieldFormat}
        isAggregatable={header?.aggregatable ?? false}
        fieldName={fieldName}
        fieldType={fieldType}
        isButton={false}
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
};

export const getFormattedFields = ({
  dataTableRows,
  headers,
  scopeId,
  closeCellPopover,
  browserFieldsByName,
}: {
  dataTableRows: Array<DataTableRecord & TimelineItem>;
  headers?: ColumnHeaderOptions[];
  scopeId: string;
  closeCellPopover?: () => void;
  browserFieldsByName: { [fieldName: string]: Partial<BrowserField> };
}) => {
  const ipFieldTypeFields =
    headers
      ?.filter((h) => browserFieldsByName[h.id] && browserFieldsByName[h.id].type === IP_FIELD_TYPE)
      .map((c) => c.id) ?? [];
  const geoFieldTypeFields =
    headers
      ?.filter(
        (h) => browserFieldsByName[h.id] && browserFieldsByName[h.id].type === GEO_FIELD_TYPE
      )
      .map((c) => c.id) ?? [];
  const byteFormattedFields =
    headers
      ?.filter(
        (h) => browserFieldsByName[h.id] && browserFieldsByName[h.id].format === BYTES_FORMAT
      )
      .map((c) => c.id) ?? [];
  return [
    ...PORT_NAMES,
    EVENT_DURATION_FIELD_NAME,
    HOST_NAME_FIELD_NAME,
    USER_NAME_FIELD_NAME,
    SIGNAL_RULE_NAME_FIELD_NAME,
    EVENT_MODULE_FIELD_NAME,
    SIGNAL_STATUS_FIELD_NAME,
    AGENT_STATUS_FIELD_NAME,
    RULE_REFERENCE_FIELD_NAME,
    REFERENCE_URL_FIELD_NAME,
    EVENT_URL_FIELD_NAME,
    INDICATOR_REFERENCE,
    ...ipFieldTypeFields,
    ...geoFieldTypeFields,
    ...byteFormattedFields,
    ...columnNamesNotDraggable,
  ].reduce(
    (
      obj: Record<string, (props: EuiDataGridCellValueElementProps) => React.ReactNode>,
      field: string
    ) => {
      obj[field] = FieldValueCell(dataTableRows, scopeId, browserFieldsByName, closeCellPopover);
      return obj;
    },
    {}
  );
};

const FormattedFieldValueComponent: React.FC<{
  asPlainText?: boolean;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  contextId: string;
  eventId: string;
  isAggregatable?: boolean;
  isObjectArray?: boolean;
  fieldFormat?: string;
  fieldName: string;
  fieldType?: string;
  isButton?: boolean;
  isDraggable?: boolean;
  onClick?: () => void;
  onClickAriaLabel?: string;
  title?: string;
  truncate?: boolean;
  value: string | number | undefined | null;
  linkValue?: string | null | undefined;
}> = ({
  asPlainText,
  Component,
  contextId,
  eventId,
  fieldFormat,
  isAggregatable = false,
  fieldName,
  fieldType = '',
  isButton,
  isObjectArray = false,
  isDraggable = true,
  onClick,
  onClickAriaLabel,
  title,
  truncate = true,
  value,
  linkValue,
}) => {
  if (isObjectArray || asPlainText) {
    return <span data-test-subj={`formatted-field-${fieldName}`}>{value}</span>;
  } else if (fieldType === IP_FIELD_TYPE) {
    return (
      <FormattedIp
        Component={Component}
        eventId={eventId}
        contextId={contextId}
        fieldName={fieldName}
        fieldType={fieldType}
        isAggregatable={isAggregatable}
        isButton={isButton}
        isDraggable={isDraggable}
        value={!isNumber(value) ? value : String(value)}
        onClick={onClick}
        title={title}
        truncate={truncate}
      />
    );
  } else if (fieldType === GEO_FIELD_TYPE) {
    return <>{value}</>;
  } else if (fieldType === DATE_FIELD_TYPE) {
    const classNames = truncate ? 'eui-textTruncate eui-alignMiddle' : undefined;
    return isDraggable ? (
      <FormattedDate className={classNames} fieldName={fieldName} value={value} />
    ) : (
      <FormattedDate className={classNames} fieldName={fieldName} value={value} />
    );
  } else if (PORT_NAMES.some((portName) => fieldName === portName)) {
    return (
      <Port
        Component={Component}
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        fieldType={fieldType}
        isAggregatable={isAggregatable}
        isDraggable={isDraggable}
        title={title}
        value={`${value}`}
      />
    );
  } else if (fieldName === EVENT_DURATION_FIELD_NAME) {
    return (
      <Duration
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        fieldType={fieldType}
        isAggregatable={isAggregatable}
        isDraggable={isDraggable}
        value={`${value}`}
      />
    );
  } else if (fieldName === HOST_NAME_FIELD_NAME) {
    return (
      <HostName
        Component={Component}
        contextId={contextId}
        eventId={eventId}
        fieldType={fieldType}
        isAggregatable={isAggregatable}
        fieldName={fieldName}
        isDraggable={isDraggable}
        isButton={isButton}
        onClick={onClick}
        title={title}
        value={value}
      />
    );
  } else if (fieldName === USER_NAME_FIELD_NAME) {
    return (
      <UserName
        Component={Component}
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        fieldType={fieldType}
        isAggregatable={isAggregatable}
        isDraggable={isDraggable}
        isButton={isButton}
        onClick={onClick}
        title={title}
        value={value}
      />
    );
  } else if (fieldFormat === BYTES_FORMAT) {
    return (
      <Bytes
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        fieldType={fieldType}
        isAggregatable={isAggregatable}
        isDraggable={isDraggable}
        value={`${value}`}
      />
    );
  } else if (fieldName === SIGNAL_RULE_NAME_FIELD_NAME) {
    return (
      <RenderRuleName
        Component={Component}
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        fieldType={fieldType}
        isAggregatable={isAggregatable}
        isDraggable={isDraggable}
        isButton={isButton}
        onClick={onClick}
        linkValue={linkValue}
        title={title}
        truncate={truncate}
        value={value}
      />
    );
  } else if (fieldName === EVENT_MODULE_FIELD_NAME) {
    return renderEventModule({
      contextId,
      eventId,
      fieldName,
      fieldType,
      isAggregatable,
      isDraggable,
      linkValue,
      truncate,
      value,
    });
  } else if (fieldName === SIGNAL_STATUS_FIELD_NAME) {
    return (
      <RuleStatus
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        fieldType={fieldType}
        isAggregatable={isAggregatable}
        isDraggable={isDraggable}
        value={value}
        onClick={onClick}
        onClickAriaLabel={onClickAriaLabel}
        iconType={isButton ? 'arrowDown' : undefined}
        iconSide={isButton ? 'right' : undefined}
      />
    );
  } else if (fieldName === AGENT_STATUS_FIELD_NAME) {
    return (
      <EndpointAgentStatusById
        endpointAgentId={String(value ?? '')}
        data-test-subj="endpointHostAgentStatus"
      />
    );
  } else if (
    [
      RULE_REFERENCE_FIELD_NAME,
      REFERENCE_URL_FIELD_NAME,
      EVENT_URL_FIELD_NAME,
      INDICATOR_REFERENCE,
    ].includes(fieldName)
  ) {
    return renderUrl({
      contextId,
      Component,
      eventId,
      fieldName,
      fieldType,
      isAggregatable,
      isDraggable,
      truncate,
      title,
      value,
    });
  } else {
    return truncate && !isEmpty(value) ? (
      <TruncatableText data-test-subj="truncatable-message">
        <EuiToolTip
          data-test-subj="message-tool-tip"
          content={
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem grow={false}>
                <span>{fieldName}</span>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <span>{value}</span>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <span data-test-subj={`formatted-field-${fieldName}`}>{value}</span>
        </EuiToolTip>
      </TruncatableText>
    ) : (
      <span data-test-subj={`formatted-field-${fieldName}`}>{value}</span>
    );
  }
};

export const FormattedFieldValue = React.memo(FormattedFieldValueComponent);
