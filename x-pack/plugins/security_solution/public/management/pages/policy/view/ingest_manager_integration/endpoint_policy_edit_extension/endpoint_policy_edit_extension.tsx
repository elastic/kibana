/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PackagePolicyEditExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { cloneDeep } from 'lodash';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import type { PolicySettingsFormProps } from '../../policy_settings_form/policy_settings_form';
import type { NewPolicyData } from '../../../../../../../common/endpoint/types';
import { EndpointPolicyArtifactCards } from './components/endpoint_policy_artifact_cards';
import { PolicySettingsForm } from '../../policy_settings_form';

/**
 * Exports Endpoint-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const EndpointPolicyEditExtension = memo<PackagePolicyEditExtensionComponentProps>(
  ({ policy, onChange, newPolicy: _newPolicy }) => {
    const policyUpdates = _newPolicy as NewPolicyData;
    const endpointPolicySettings = policyUpdates.inputs[0].config.policy.value;
    const { canAccessFleet } = useUserPrivileges().endpointPrivileges;

    const endpointPolicySettingsOnChangeHandler: PolicySettingsFormProps['onChange'] = useCallback(
      ({ isValid, updatedPolicy }) => {
        const newPolicyInputs = cloneDeep(policyUpdates.inputs);
        newPolicyInputs[0].config.policy.value = updatedPolicy;

        onChange({
          isValid,
          updatedPolicy: { inputs: newPolicyInputs },
        });
      },
      [onChange, policyUpdates.inputs]
    );

    return (
      <>
        <EuiSpacer size="m" />
        <div data-test-subj="endpointIntegrationPolicyForm">
          <EndpointPolicyArtifactCards policyId={policy.id} />

          <div>
            <EuiText>
              <h5>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policyDetails.settings.title"
                  defaultMessage="Policy settings"
                />
              </h5>
            </EuiText>

            <EuiSpacer size="s" />

            <PolicySettingsForm
              policy={endpointPolicySettings}
              onChange={endpointPolicySettingsOnChangeHandler}
              mode={canAccessFleet ? 'edit' : 'view'}
              data-test-subj="endpointPolicyForm"
            />
          </div>
        </div>
      </>
    );
  }
);
EndpointPolicyEditExtension.displayName = 'EndpointPolicyEditExtension';
