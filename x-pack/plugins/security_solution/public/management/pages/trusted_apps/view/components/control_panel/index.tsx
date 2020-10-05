/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ViewType } from '../../../state';
import { ViewTypeToggle } from '../view_type_toggle';

export interface ControlPanelProps {
  state: {
    totalItemsCount: number;
    currentViewType: ViewType;
  };
  onViewTypeChange: (value: ViewType) => void;
}

export const ControlPanel = memo(({ state, onViewTypeChange }: ControlPanelProps) => {
  return (
    <EuiFlexGroup direction="row" alignItems="center">
      <EuiFlexItem grow={1}>
        <EuiText color="subdued" size="xs">
          {i18n.translate('xpack.securitySolution.trustedapps.list.totalCount', {
            defaultMessage:
              '{totalItemCount, plural, one {# trusted application} other {# trusted applications}}',
            values: { totalItemCount: state.totalItemsCount },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ViewTypeToggle selectedOption={state.currentViewType} onToggle={onViewTypeChange} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

ControlPanel.displayName = 'ControlPanel';
