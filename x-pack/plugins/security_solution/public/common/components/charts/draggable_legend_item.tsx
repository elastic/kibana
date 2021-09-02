/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import React from 'react';

import { DefaultDraggable } from '../draggables';

export interface LegendItem {
  color?: string;
  dataProviderId: string;
  field: string;
  timelineId?: string;
  value: string;
}

const DraggableLegendItemComponent: React.FC<{
  legendItem: LegendItem;
}> = ({ legendItem }) => {
  const { color, dataProviderId, field, timelineId, value } = legendItem;

  return (
    <EuiText size="xs">
      <EuiFlexGroup alignItems="center" gutterSize="none">
        {color != null && (
          <EuiFlexItem grow={false}>
            <EuiHealth data-test-subj="legend-color" color={color} />
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <DefaultDraggable
            data-test-subj={`legend-item-${dataProviderId}`}
            field={field}
            hideTopN={true}
            id={dataProviderId}
            isDraggable={false}
            timelineId={timelineId}
            value={value}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};

DraggableLegendItemComponent.displayName = 'DraggableLegendItemComponent';

export const DraggableLegendItem = React.memo(DraggableLegendItemComponent);
