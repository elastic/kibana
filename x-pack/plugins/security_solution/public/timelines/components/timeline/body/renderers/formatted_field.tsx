/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { isNumber, isEmpty } from 'lodash/fp';
import React from 'react';

import { INDICATOR_REFERENCE } from '../../../../../../common/cti/constants';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { Bytes, BYTES_FORMAT } from './bytes';
import { Duration, EVENT_DURATION_FIELD_NAME } from '../../../duration';
import { getOrEmptyTagFromValue } from '../../../../../common/components/empty_value';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import { FormattedIp } from '../../../../components/formatted_ip';

import { Port, PORT_NAMES } from '../../../../../network/components/port';
import { TruncatableText } from '../../../../../common/components/truncatable_text';
import {
  DATE_FIELD_TYPE,
  HOST_NAME_FIELD_NAME,
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
import { AgentStatuses } from './agent_statuses';

// simple black-list to prevent dragging and dropping fields such as message name
const columnNamesNotDraggable = [MESSAGE_FIELD_NAME];

const FormattedFieldValueComponent: React.FC<{
  contextId: string;
  eventId: string;
  isObjectArray?: boolean;
  fieldFormat?: string;
  fieldName: string;
  fieldType?: string;
  isDraggable?: boolean;
  truncate?: boolean;
  value: string | number | undefined | null;
  linkValue?: string | null | undefined;
}> = ({
  contextId,
  eventId,
  fieldFormat,
  fieldName,
  fieldType,
  isObjectArray = false,
  isDraggable = true,
  truncate,
  value,
  linkValue,
}) => {
  if (isObjectArray) {
    return <>{value}</>;
  } else if (fieldType === IP_FIELD_TYPE) {
    return (
      <FormattedIp
        eventId={eventId}
        contextId={contextId}
        fieldName={fieldName}
        isDraggable={isDraggable}
        value={!isNumber(value) ? value : String(value)}
        truncate={truncate}
      />
    );
  } else if (fieldType === GEO_FIELD_TYPE) {
    return <>{value}</>;
  } else if (fieldType === DATE_FIELD_TYPE) {
    return isDraggable ? (
      <DefaultDraggable
        field={fieldName}
        id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
        isDraggable={isDraggable}
        tooltipContent={null}
        value={`${value}`}
      >
        <FormattedDate fieldName={fieldName} value={value} />
      </DefaultDraggable>
    ) : (
      <FormattedDate fieldName={fieldName} value={value} />
    );
  } else if (PORT_NAMES.some((portName) => fieldName === portName)) {
    return (
      <Port
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        isDraggable={isDraggable}
        value={`${value}`}
      />
    );
  } else if (fieldName === EVENT_DURATION_FIELD_NAME) {
    return (
      <Duration
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        isDraggable={isDraggable}
        value={`${value}`}
      />
    );
  } else if (fieldName === HOST_NAME_FIELD_NAME) {
    return (
      <HostName
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        isDraggable={isDraggable}
        value={value}
      />
    );
  } else if (fieldFormat === BYTES_FORMAT) {
    return (
      <Bytes
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        isDraggable={isDraggable}
        value={`${value}`}
      />
    );
  } else if (fieldName === SIGNAL_RULE_NAME_FIELD_NAME) {
    return (
      <RenderRuleName
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        isDraggable={isDraggable}
        linkValue={linkValue}
        truncate={truncate}
        value={value}
      />
    );
  } else if (fieldName === EVENT_MODULE_FIELD_NAME) {
    return renderEventModule({
      contextId,
      eventId,
      fieldName,
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
        isDraggable={isDraggable}
        value={value}
      />
    );
  } else if (fieldName === AGENT_STATUS_FIELD_NAME) {
    return (
      <AgentStatuses
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        isDraggable={isDraggable}
        value={typeof value === 'string' ? value : ''}
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
    return renderUrl({ contextId, eventId, fieldName, linkValue, isDraggable, truncate, value });
  } else if (columnNamesNotDraggable.includes(fieldName) || !isDraggable) {
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
  } else {
    const contentValue = getOrEmptyTagFromValue(value);
    const content = truncate ? <TruncatableText>{contentValue}</TruncatableText> : contentValue;
    return (
      <DefaultDraggable
        field={fieldName}
        id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
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
