/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { DefaultDraggable } from '../draggables';

import * as i18n from './translation';

// The "All others" legend item is not draggable
const AllOthers = styled.span`
  padding-left: 7px;
`;

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
          {value !== i18n.ALL_OTHERS ? (
            <DefaultDraggable
              data-test-subj={`legend-item-${dataProviderId}`}
              field={field}
              id={dataProviderId}
              timelineId={timelineId}
              value={value}
            />
          ) : (
            <>
              <AllOthers data-test-subj="all-others-legend-item">{value}</AllOthers>
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};

DraggableLegendItemComponent.displayName = 'DraggableLegendItemComponent';

export const DraggableLegendItem = React.memo(DraggableLegendItemComponent);
