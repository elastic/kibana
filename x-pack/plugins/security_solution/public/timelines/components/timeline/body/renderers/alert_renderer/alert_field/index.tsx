/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { AlertFieldBadge } from './alert_field_badge';
import { AlertFieldFlexGroup } from '../helpers';

export const DEFAULT_FIELD_TYPE = 'keyword';

interface Props {
  contextId: string;
  'data-test-subj'?: string;
  eventId: string;
  field: string;
  fieldType?: string;
  isAggregatable?: boolean;
  isDraggable: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  timelineId: string;
  values: string[] | number[] | null | undefined;
}

const AlertFieldComponent: React.FC<Props> = ({
  contextId,
  'data-test-subj': dataTestSubj = 'alertField',
  eventId,
  field,
  fieldType = DEFAULT_FIELD_TYPE,
  isAggregatable = true,
  isDraggable,
  prefix,
  suffix,
  timelineId,
  values,
}) =>
  values != null ? (
    <AlertFieldFlexGroup
      alignItems="center"
      data-test-subj={dataTestSubj}
      $timelineId={timelineId}
      gutterSize="none"
    >
      {prefix != null && (
        <EuiFlexItem data-test-subj="prefix" grow={false}>
          {prefix}
        </EuiFlexItem>
      )}
      {values.map((x, i) => (
        <EuiFlexItem key={`${x}-${i}`} grow={false}>
          <AlertFieldBadge
            contextId={`${contextId}-alert-field`}
            eventId={eventId}
            field={field}
            fieldType={fieldType}
            isAggregatable={isAggregatable}
            isDraggable={isDraggable}
            showSeparator={i < values.length - 1}
            timelineId={timelineId}
            value={x}
          />
        </EuiFlexItem>
      ))}
      {suffix != null && (
        <EuiFlexItem data-test-subj="suffix" grow={false}>
          {suffix}
        </EuiFlexItem>
      )}
    </AlertFieldFlexGroup>
  ) : null;

AlertFieldComponent.displayName = 'AlertFieldComponent';

export const AlertField = React.memo(AlertFieldComponent);
