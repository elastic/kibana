/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSuperSelect,
  EuiFieldText,
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TrustedApp } from '../../../../../../../../common/endpoint/types';

const ConditionEntryCell = memo<{
  showLabel: boolean;
  label?: string;
  children: React.ReactElement;
}>(({ showLabel, label = '', children }) => {
  return showLabel ? (
    <EuiFormRow label={label} fullWidth>
      {children}
    </EuiFormRow>
  ) : (
    <>{children}</>
  );
});

ConditionEntryCell.displayName = 'ConditionEntryCell';

export interface ConditionEntryProps {
  // FIXME:PT probably need to adjust below types to match what is done in `TrustedApp` type
  os: TrustedApp['os'];
  entry: TrustedApp['entries'][0];
  /** controls if remove button is enabled/disabled */
  isRemoveDisabled?: boolean;
  /** If the labels for each Column in the input row should be shown. Normally set on the first row entry */
  showLabels: boolean;
}
export const ConditionEntry = memo<ConditionEntryProps>(
  ({ showLabels = false, isRemoveDisabled = false }) => {
    const handleRemoveClick = useCallback(() => {}, []);

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" direction="row">
        <EuiFlexItem grow={2}>
          <ConditionEntryCell
            showLabel={showLabels}
            label={i18n.translate(
              'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.field',
              { defaultMessage: 'Field' }
            )}
          >
            <EuiSuperSelect options={[]} />
          </ConditionEntryCell>
        </EuiFlexItem>
        <EuiFlexItem>
          <ConditionEntryCell
            showLabel={showLabels}
            label={i18n.translate(
              'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.operator',
              { defaultMessage: 'Operator' }
            )}
          >
            <EuiFieldText
              name="operator"
              value={i18n.translate(
                'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.operator.is',
                { defaultMessage: 'is' }
              )}
              readOnly
            />
          </ConditionEntryCell>
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <ConditionEntryCell
            showLabel={showLabels}
            label={i18n.translate(
              'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.value',
              { defaultMessage: 'Value' }
            )}
          >
            <EuiFieldText name="operator" value="is" />
          </ConditionEntryCell>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ConditionEntryCell showLabel={showLabels} label={''}>
            <EuiButtonIcon
              color="danger"
              iconType="trash"
              onClick={handleRemoveClick}
              isDisabled={isRemoveDisabled}
            />
          </ConditionEntryCell>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConditionEntry.displayName = 'ConditionEntry';
