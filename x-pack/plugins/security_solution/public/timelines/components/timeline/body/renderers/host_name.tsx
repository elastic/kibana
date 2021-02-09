/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isString } from 'lodash/fp';

import { DefaultDraggable } from '../../../../../common/components/draggables';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { HostDetailsLink } from '../../../../../common/components/links';
import { TruncatableText } from '../../../../../common/components/truncatable_text';

interface Props {
  contextId: string;
  eventId: string;
  fieldName: string;
  value: string | number | undefined | null;
}

const HostNameComponent: React.FC<Props> = ({ fieldName, contextId, eventId, value }) => {
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
};

export const HostName = React.memo(HostNameComponent);
HostName.displayName = 'HostName';
