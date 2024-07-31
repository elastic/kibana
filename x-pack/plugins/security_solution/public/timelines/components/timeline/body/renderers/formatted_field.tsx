/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import type { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { isEmpty, isNumber } from 'lodash/fp';
import React from 'react';
import { css } from '@emotion/css';

import type { BrowserField } from '../../../../../common/containers/source';
import {
  ALERT_HOST_CRITICALITY,
  ALERT_USER_CRITICALITY,
} from '../../../../../../common/field_maps/field_names';
import { AgentStatus } from '../../../../../common/components/endpoint/agents/agent_status';
import { INDICATOR_REFERENCE } from '../../../../../../common/cti/constants';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { Bytes, BYTES_FORMAT } from './bytes';
import { Duration, EVENT_DURATION_FIELD_NAME } from '../../../duration';
import { getOrEmptyTagFromValue } from '../../../../../common/components/empty_value';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import { FormattedIp } from '../../../formatted_ip';
import { Port } from '../../../../../explore/network/components/port';
import { PORT_NAMES } from '../../../../../explore/network/components/port/helpers';
import { TruncatableText } from '../../../../../common/components/truncatable_text';
import {
  AGENT_STATUS_FIELD_NAME,
  DATE_FIELD_TYPE,
  EVENT_MODULE_FIELD_NAME,
  EVENT_URL_FIELD_NAME,
  GEO_FIELD_TYPE,
  HOST_NAME_FIELD_NAME,
  IP_FIELD_TYPE,
  MESSAGE_FIELD_NAME,
  REFERENCE_URL_FIELD_NAME,
  RULE_REFERENCE_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
  SIGNAL_STATUS_FIELD_NAME,
  USER_NAME_FIELD_NAME,
} from './constants';
import { renderEventModule, RenderRuleName, renderUrl } from './formatted_field_helpers';
import { RuleStatus } from './rule_status';
import { HostName } from './host_name';
import { UserName } from './user_name';
import { AssetCriticalityLevel } from './asset_criticality_level';
import { RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD } from '../../../../../../common/endpoint/service/response_actions/constants';

// simple black-list to prevent dragging and dropping fields such as message name
const columnNamesNotDraggable = [MESSAGE_FIELD_NAME];

// Offset top-aligned tooltips so that cell actions are more visible
const dataGridToolTipOffset = css`
  &[data-position='top'] {
    margin-block-start: -8px;
  }
`;

const FormattedFieldValueComponent: React.FC<{
  asPlainText?: boolean;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  contextId: string;
  eventId: string;
  isAggregatable?: boolean;
  isObjectArray?: boolean;
  isUnifiedDataTable?: boolean;
  fieldFormat?: string;
  fieldFromBrowserField?: Partial<BrowserField>;
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
  isUnifiedDataTable,
  fieldName,
  fieldType = '',
  fieldFromBrowserField,
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
    const classNames = truncate ? 'eui-textTruncate' : undefined;
    const date = (
      <FormattedDate
        className={classNames}
        fieldName={fieldName}
        value={value}
        tooltipProps={
          isUnifiedDataTable ? undefined : { position: 'bottom', className: dataGridToolTipOffset }
        }
      />
    );
    if (isUnifiedDataTable) return date;
    return isDraggable ? (
      <DefaultDraggable
        field={fieldName}
        fieldType={fieldType}
        isAggregatable={isAggregatable}
        id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
        isDraggable={isDraggable}
        tooltipContent={null}
        value={`${value}`}
      >
        {date}
      </DefaultDraggable>
    ) : (
      date
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
  } else if (
    fieldName === AGENT_STATUS_FIELD_NAME &&
    fieldFromBrowserField?.name === RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELD.sentinel_one
  ) {
    return <AgentStatus agentId={String(value ?? '')} agentType="sentinel_one" />;
  } else if (fieldName === ALERT_HOST_CRITICALITY || fieldName === ALERT_USER_CRITICALITY) {
    return (
      <AssetCriticalityLevel
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        fieldType={fieldType}
        isAggregatable={isAggregatable}
        isDraggable={isDraggable}
        value={value}
      />
    );
  } else if (fieldName === AGENT_STATUS_FIELD_NAME) {
    return (
      <AgentStatus
        agentId={String(value ?? '')}
        agentType="endpoint"
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
  } else if (isUnifiedDataTable || columnNamesNotDraggable.includes(fieldName) || !isDraggable) {
    return truncate && !isEmpty(value) ? (
      <TruncatableText data-test-subj="truncatable-message">
        <EuiToolTip
          data-test-subj="message-tool-tip"
          position="bottom"
          className={dataGridToolTipOffset}
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
  } else {
    // This should not be reached for the unified data table
    const contentValue = getOrEmptyTagFromValue(value);
    const content = truncate ? <TruncatableText>{contentValue}</TruncatableText> : contentValue;
    return (
      <DefaultDraggable
        field={fieldName}
        id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
        fieldType={fieldType ?? ''}
        isAggregatable={isAggregatable}
        isDraggable={isDraggable}
        value={`${value}`}
        tooltipContent={
          fieldType === DATE_FIELD_TYPE || fieldType === EVENT_DURATION_FIELD_NAME
            ? null
            : fieldName
        }
      >
        {content}
      </DefaultDraggable>
    );
  }
};

export const FormattedFieldValue = React.memo(FormattedFieldValueComponent);
