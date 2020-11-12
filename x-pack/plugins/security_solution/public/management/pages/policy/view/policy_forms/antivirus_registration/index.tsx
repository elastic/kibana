/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';

import { isAntivirusRegistrationEnabled } from '../../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { ConfigForm } from '../../components/config_form';

export const AntivirusRegistrationForm = memo(() => {
  const antivirusRegistrationEnabled = usePolicyDetailsSelector(isAntivirusRegistrationEnabled);
  const dispatch = useDispatch();

  const handleSwitchChange = useCallback(
    (event) =>
      dispatch({
        type: 'userChangedAntivirusRegistration',
        payload: {
          enabled: event.target.checked,
        },
      }),
    [dispatch]
  );

  return (
    <ConfigForm
      type={i18n.translate(
        'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.type',
        {
          defaultMessage: 'Register as anti-virus',
        }
      )}
      supportedOss={['windows']}
    >
      <EuiText size="s">
        {i18n.translate(
          'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.explanation',
          {
            defaultMessage: 'Switch the toggle to on to register Elastic anti-virus',
          }
        )}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiSwitch
        label={i18n.translate(
          'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.toggle',
          {
            defaultMessage: 'Register as anti-virus',
          }
        )}
        checked={antivirusRegistrationEnabled}
        onChange={handleSwitchChange}
      />
    </ConfigForm>
  );
});

AntivirusRegistrationForm.displayName = 'AntivirusRegistrationForm';
