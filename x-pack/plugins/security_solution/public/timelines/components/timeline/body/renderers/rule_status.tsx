/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiBadge } from '@elastic/eui';
import { getOr } from 'lodash/fp';

import { DefaultDraggable } from '../../../../../common/components/draggables';

const mapping = {
  open: 'primary',
  'in progress': 'warning',
  closed: 'default',
};

interface Props {
  contextId: string;
  eventId: string;
  fieldName: string;
  value: string | number | undefined | null;
}

export const RenderRuleStatus: React.FC<Props> = ({ contextId, eventId, fieldName, value }) => {
  const color = useMemo(() => getOr('default', `${value}`, mapping), [value]);
  return (
    <EuiBadge color={color}>
      <DefaultDraggable
        field={fieldName}
        id={`alert-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
        value={`${value}`}
        tooltipContent={fieldName}
      >
        {value}
      </DefaultDraggable>
    </EuiBadge>
  );
};

export const RuleStatus = React.memo(RenderRuleStatus);
RuleStatus.displayName = 'RuleStatus';
