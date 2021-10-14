/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import React from 'react';

import { DefaultDraggable } from '../../../common/components/draggables';
import { getEmptyValue } from '../../../common/components/empty_value';
import { PortOrServiceNameLink } from '../../../common/components/links';

export const Port = React.memo<{
  contextId: string;
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  eventId: string;
  fieldName: string;
  isDraggable?: boolean;
  title?: string;
  value: string | undefined | null;
}>(({ Component, contextId, eventId, fieldName, isDraggable, title, value }) =>
  isDraggable ? (
    <DefaultDraggable
      data-test-subj="port"
      field={fieldName}
      id={`port-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
      isDraggable={isDraggable}
      tooltipContent={fieldName}
      value={value}
    >
      <PortOrServiceNameLink
        portOrServiceName={value || getEmptyValue()}
        Component={Component}
        title={title}
      />
    </DefaultDraggable>
  ) : (
    <PortOrServiceNameLink
      portOrServiceName={value || getEmptyValue()}
      Component={Component}
      title={title}
    />
  )
);

Port.displayName = 'Port';
