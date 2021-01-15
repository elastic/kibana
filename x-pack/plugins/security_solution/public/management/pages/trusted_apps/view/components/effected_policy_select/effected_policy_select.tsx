/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiFormRow,
  EuiSelectable,
  EuiSelectableProps,
  EuiSwitch,
  EuiSwitchProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PolicyData } from '../../../../../../../common/endpoint/types';

export type EffectedPolicySelectProps = Omit<EuiSelectableProps, 'onChange' | 'options'> & {
  options: Omit<EuiSelectableProps['options'], 'label'> & { policy: PolicyData };
  onChange: (selection: { isGlobal: boolean; selectedPolicies: PolicyData[] }) => void;
  isGlobal: boolean;
};
export const EffectedPolicySelect = memo<EffectedPolicySelectProps>(
  ({ isGlobal, onChange, listProps, ...otherSelectableProps }) => {
    const DEFAULT_LIST_PROPS = useMemo(() => ({ bordered: true }), []);

    // FIXME: temporary for testing only
    const policyOptions = Array.from({ length: 30 }, (_, i) => ({ label: `policy ${i + 1}` }));

    const handleOnPolicySelectChange: EuiSelectableProps['onChange'] = useCallback(
      (changedOptions) => {
        debugger;
      },
      []
    );

    const handleGlobalSwitchChange: EuiSwitchProps['onChange'] = useCallback(() => {
      debugger;
    }, []);

    return (
      <>
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.securitySolution.trustedapps.policySelect.globalSectionTitle',
            {
              defaultMessage: 'Global application',
            }
          )}
        >
          <EuiSwitch
            label={i18n.translate(
              'xpack.securitySolution.trustedapps.policySelect.globalSwitchTitle',
              {
                defaultMessage: 'Apply trusted application globally',
              }
            )}
            checked={isGlobal}
            onChange={handleGlobalSwitchChange}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.securitySolution.policySelect.policySpecificSectionTitle', {
            defaultMessage: 'Apply to specific endpoint policies',
          })}
        >
          <EuiSelectable
            {...otherSelectableProps}
            options={policyOptions}
            listProps={listProps || DEFAULT_LIST_PROPS}
            onChange={handleOnPolicySelectChange}
          >
            {(list) => list}
          </EuiSelectable>
        </EuiFormRow>
      </>
    );
  }
);

EffectedPolicySelect.displayName = 'PolicySelect';
