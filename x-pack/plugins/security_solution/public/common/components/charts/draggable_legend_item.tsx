/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import React from 'react';
import { isEmpty } from 'lodash/fp';

import { DefaultDraggable } from '../draggables';
import { EMPTY_VALUE_LABEL } from './translation';

export interface LegendItem {
  color?: string;
  dataProviderId: string;
  field: string;
  timelineId?: string;
  value: string;
}

/**
 * Renders the value or a placeholder in case the value is empty
 */
const ValueWrapper = React.memo<{ value?: string | null }>(({ value }) =>
  isEmpty(value) ? <em data-test-subj="value-wrapper-empty">{EMPTY_VALUE_LABEL}</em> : <>{value}</>
);

ValueWrapper.displayName = 'ValueWrapper';

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
          >
            <ValueWrapper value={value} />
          </DefaultDraggable>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};

DraggableLegendItemComponent.displayName = 'DraggableLegendItemComponent';

export const DraggableLegendItem = React.memo(DraggableLegendItemComponent);
