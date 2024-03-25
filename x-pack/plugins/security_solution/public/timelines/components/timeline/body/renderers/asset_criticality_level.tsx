/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { isString } from 'lodash/fp';
import type { CriticalityLevel } from '../../../../../../common/entity_analytics/asset_criticality/types';
import { CRITICALITY_LEVEL_COLOR } from '../../../../../entity_analytics/components/asset_criticality';
import { DefaultDraggable } from '../../../../../common/components/draggables';

interface Props {
  contextId: string;
  eventId: string;
  fieldName: string;
  fieldType: string;
  isAggregatable: boolean;
  isDraggable: boolean;
  value: string | number | undefined | null;
}

const AssetCriticalityLevelComponent: React.FC<Props> = ({
  contextId,
  eventId,
  fieldName,
  fieldType,
  isAggregatable,
  isDraggable,
  value,
}) => {
  const color = isString(value) ? CRITICALITY_LEVEL_COLOR[value as CriticalityLevel] : 'normal';

  const badge = (
    <EuiBadge color={color} data-test-subj="AssetCriticalityLevel-score-badge">
      {value}
    </EuiBadge>
  );

  return isDraggable ? (
    <DefaultDraggable
      field={fieldName}
      id={`alert-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
      fieldType={fieldType}
      isAggregatable={isAggregatable}
      isDraggable={isDraggable}
      value={`${value}`}
      tooltipContent={fieldName}
    >
      {badge}
    </DefaultDraggable>
  ) : (
    badge
  );
};

export const AssetCriticalityLevel = React.memo(AssetCriticalityLevelComponent);
AssetCriticalityLevel.displayName = 'AssetCriticalityLevel';
