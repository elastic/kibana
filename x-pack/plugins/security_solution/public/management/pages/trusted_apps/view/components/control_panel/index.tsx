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
  totalItemCount: number;
  currentViewType: ViewType;
  onViewTypeChange: (value: ViewType) => void;
}

export const ControlPanel = memo<ControlPanelProps>(
  ({ totalItemCount, currentViewType, onViewTypeChange }) => {
    return (
      <EuiFlexGroup direction="row" alignItems="center">
        <EuiFlexItem grow={1}>
          <EuiText color="subdued" size="xs" data-test-subj="trustedAppsListViewCountLabel">
            {i18n.translate('xpack.securitySolution.trustedapps.list.totalCount', {
              defaultMessage:
                '{totalItemCount, plural, one {# trusted application} other {# trusted applications}}',
              values: { totalItemCount },
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ViewTypeToggle selectedOption={currentViewType} onToggle={onViewTypeChange} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ControlPanel.displayName = 'ControlPanel';
