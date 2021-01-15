/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiFormRow, EuiSelectable, EuiSelectableProps, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type PolicySelectProps = EuiSelectableProps;
export const EffectedPolicySelect = memo<PolicySelectProps>(
  ({ listProps, ...otherSelectableProps }) => {
    const DEFAULT_LIST_PROPS = useMemo(() => ({ bordered: true }), []);
    // FIXME: temporary for testing only
    const options = Array.from({ length: 30 }, (_, i) => ({ label: `policy ${i + 1}` }));

    const handleOnPolicySelectChange: EuiSelectableProps['onChange'] = useCallback(
      (changedOptions) => {},
      []
    );

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
            checked={true}
            onChange={(e) => {}}
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
            options={options}
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
