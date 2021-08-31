/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge } from '@elastic/eui';
import { getOr } from 'lodash/fp';

import styled from 'styled-components';
import { DefaultDraggable } from '../../../../../common/components/draggables';

const mapping = {
  open: 'primary',
  acknowledged: 'warning',
  closed: 'default',
};

const StyledEuiBadge = styled(EuiBadge)`
  text-transform: capitalize;
`;

interface Props {
  contextId: string;
  eventId: string;
  fieldName: string;
  isDraggable: boolean;
  value: string | number | undefined | null;
}

const RuleStatusComponent: React.FC<Props> = ({
  contextId,
  eventId,
  fieldName,
  isDraggable,
  value,
}) => {
  const color = useMemo(() => getOr('default', `${value}`, mapping), [value]);
  return isDraggable ? (
    <DefaultDraggable
      field={fieldName}
      id={`alert-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
      isDraggable={false}
      value={`${value}`}
      tooltipContent={fieldName}
    >
      <StyledEuiBadge color={color}>{value}</StyledEuiBadge>
    </DefaultDraggable>
  ) : (
    <StyledEuiBadge color={color}>{value}</StyledEuiBadge>
  );
};

export const RuleStatus = React.memo(RuleStatusComponent);
RuleStatus.displayName = 'RuleStatus';
