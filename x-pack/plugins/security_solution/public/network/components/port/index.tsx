/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DefaultDraggable } from '../../../common/components/draggables';
import { getEmptyValue } from '../../../common/components/empty_value';
import { PortOrServiceNameLink } from '../../../common/components/links';

export const CLIENT_PORT_FIELD_NAME = 'client.port';
export const DESTINATION_PORT_FIELD_NAME = 'destination.port';
export const SERVER_PORT_FIELD_NAME = 'server.port';
export const SOURCE_PORT_FIELD_NAME = 'source.port';
export const URL_PORT_FIELD_NAME = 'url.port';

export const PORT_NAMES = [
  CLIENT_PORT_FIELD_NAME,
  DESTINATION_PORT_FIELD_NAME,
  SERVER_PORT_FIELD_NAME,
  SOURCE_PORT_FIELD_NAME,
  URL_PORT_FIELD_NAME,
];

export const Port = React.memo<{
  contextId: string;
  eventId: string;
  fieldName: string;
  isDraggable?: boolean;
  value: string | undefined | null;
}>(({ contextId, eventId, fieldName, isDraggable, value }) =>
  isDraggable ? (
    <DefaultDraggable
      data-test-subj="port"
      field={fieldName}
      id={`port-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
      isDraggable={isDraggable}
      tooltipContent={fieldName}
      value={value}
    >
      <PortOrServiceNameLink portOrServiceName={value || getEmptyValue()} />
    </DefaultDraggable>
  ) : (
    <PortOrServiceNameLink portOrServiceName={value || getEmptyValue()} />
  )
);

Port.displayName = 'Port';
