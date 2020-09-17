/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { isNumber, isString, isEmpty } from 'lodash/fp';
import React from 'react';

import { DefaultDraggable } from '../../../../../common/components/draggables';
import { Bytes, BYTES_FORMAT } from './bytes';
import { Duration, EVENT_DURATION_FIELD_NAME } from '../../../duration';
import {
  getOrEmptyTagFromValue,
  getEmptyTagValue,
} from '../../../../../common/components/empty_value';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import { FormattedIp } from '../../../../components/formatted_ip';
import { HostDetailsLink } from '../../../../../common/components/links';

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
} from './constants';
import { RenderRuleName, renderEventModule, renderUrl } from './formatted_field_helpers';

// simple black-list to prevent dragging and dropping fields such as message name
const columnNamesNotDraggable = [MESSAGE_FIELD_NAME];

const FormattedFieldValueComponent: React.FC<{
  contextId: string;
  eventId: string;
  fieldFormat?: string;
  fieldName: string;
  fieldType: string;
  truncate?: boolean;
  value: string | number | undefined | null;
  linkValue?: string | null | undefined;
}> = ({ contextId, eventId, fieldFormat, fieldName, fieldType, truncate, value, linkValue }) => {
  if (fieldType === IP_FIELD_TYPE) {
    return (
      <FormattedIp
        eventId={eventId}
        contextId={contextId}
        fieldName={fieldName}
        value={!isNumber(value) ? value : String(value)}
      />
    );
  } else if (fieldType === DATE_FIELD_TYPE) {
    return (
      <DefaultDraggable
        field={fieldName}
        id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
        tooltipContent={null}
        value={`${value}`}
      >
        <FormattedDate fieldName={fieldName} value={value} />
      </DefaultDraggable>
    );
  } else if (PORT_NAMES.some((portName) => fieldName === portName)) {
    return (
      <Port contextId={contextId} eventId={eventId} fieldName={fieldName} value={`${value}`} />
    );
  } else if (fieldName === EVENT_DURATION_FIELD_NAME) {
    return (
      <Duration contextId={contextId} eventId={eventId} fieldName={fieldName} value={`${value}`} />
    );
  } else if (fieldName === HOST_NAME_FIELD_NAME) {
    const hostname = `${value}`;

    return isString(value) && hostname.length > 0 ? (
      <DefaultDraggable
        field={fieldName}
        id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
        tooltipContent={value}
        value={value}
      >
        <HostDetailsLink data-test-subj="host-details-link" hostName={hostname}>
          <TruncatableText data-test-subj="draggable-truncatable-content">{value}</TruncatableText>
        </HostDetailsLink>
      </DefaultDraggable>
    ) : (
      getEmptyTagValue()
    );
  } else if (fieldFormat === BYTES_FORMAT) {
    return (
      <Bytes contextId={contextId} eventId={eventId} fieldName={fieldName} value={`${value}`} />
    );
  } else if (fieldName === SIGNAL_RULE_NAME_FIELD_NAME) {
    return (
      <RenderRuleName
        contextId={contextId}
        eventId={eventId}
        fieldName={fieldName}
        linkValue={linkValue}
        truncate={truncate}
        value={value}
      />
    );
  } else if (fieldName === EVENT_MODULE_FIELD_NAME) {
    return renderEventModule({ contextId, eventId, fieldName, linkValue, truncate, value });
  } else if (
    [RULE_REFERENCE_FIELD_NAME, REFERENCE_URL_FIELD_NAME, EVENT_URL_FIELD_NAME].includes(fieldName)
  ) {
    return renderUrl({ contextId, eventId, fieldName, linkValue, truncate, value });
  } else if (columnNamesNotDraggable.includes(fieldName)) {
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
          <>{value}</>
        </EuiToolTip>
      </TruncatableText>
    ) : (
      <>{value}</>
    );
  } else {
    const contentValue = getOrEmptyTagFromValue(value);
    const content = truncate ? <TruncatableText>{contentValue}</TruncatableText> : contentValue;

    return (
      <DefaultDraggable
        field={fieldName}
        id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
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
