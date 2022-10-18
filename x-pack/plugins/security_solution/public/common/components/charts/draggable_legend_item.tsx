/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React from 'react';
import styled from 'styled-components';

import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import { DefaultDraggable } from '../draggables';
import { useUiSetting$ } from '../../lib/kibana';
import { EMPTY_VALUE_LABEL } from './translation';
import { hasValueToDisplay } from '../../utils/validators';

const CountFlexItem = styled(EuiFlexItem)`
  ${({ theme }) => `margin-right: ${theme.eui.euiSizeS};`}
`;

export interface LegendItem {
  color?: string;
  dataProviderId: string;
  render?: (fieldValuePair?: { field: string; value: string | number }) => React.ReactNode;
  field: string;
  scopeId?: string;
  value: string | number;
  count?: number;
}

/**
 * Renders the value or a placeholder in case the value is empty
 */
const ValueWrapper = React.memo<{ value: LegendItem['value'] }>(({ value }) =>
  hasValueToDisplay(value) ? (
    <>{value}</>
  ) : (
    <em data-test-subj="value-wrapper-empty">{EMPTY_VALUE_LABEL}</em>
  )
);

ValueWrapper.displayName = 'ValueWrapper';

const DraggableLegendItemComponent: React.FC<{
  legendItem: LegendItem;
}> = ({ legendItem }) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const { color, count, dataProviderId, field, scopeId, value } = legendItem;

  return (
    <EuiText size="xs">
      <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
        {color != null && (
          <EuiFlexItem grow={false}>
            <EuiHealth data-test-subj="legend-color" color={color} />
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={true}>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="none"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <DefaultDraggable
                data-test-subj={`legend-item-${dataProviderId}`}
                field={field}
                hideTopN={true}
                id={dataProviderId}
                isDraggable={false}
                scopeId={scopeId}
                value={value}
              >
                {legendItem.render == null ? (
                  <ValueWrapper value={value} />
                ) : (
                  legendItem.render({ field, value })
                )}
              </DefaultDraggable>
            </EuiFlexItem>

            {count != null && (
              <CountFlexItem data-test-subj="legendItemCount" grow={false}>
                {numeral(count).format(defaultNumberFormat)}
              </CountFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};

DraggableLegendItemComponent.displayName = 'DraggableLegendItemComponent';

export const DraggableLegendItem = React.memo(DraggableLegendItemComponent);
