/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';

import { OperatingSystem } from '../../../../../../../common/endpoint/types';
import { isAntivirusRegistrationEnabled } from '../../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { ConfigForm } from '../../components/config_form';

const TRANSLATIONS: Readonly<{ [K in 'title' | 'description' | 'label']: string }> = {
  title: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.type',
    {
      defaultMessage: 'Register as anti-virus',
    }
  ),
  description: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.explanation',
    {
      defaultMessage:
        'Toggle on to register Elastic as an official Anti-Virus solution for Windows OS. ' +
        'This will also disable Windows Defender.',
    }
  ),
  label: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.toggle',
    {
      defaultMessage: 'Register as anti-virus',
    }
  ),
};

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
    <ConfigForm type={TRANSLATIONS.title} supportedOss={[OperatingSystem.WINDOWS]}>
      <EuiText size="s">{TRANSLATIONS.description}</EuiText>
      <EuiSpacer size="s" />
      <EuiSwitch
        label={TRANSLATIONS.label}
        checked={antivirusRegistrationEnabled}
        onChange={handleSwitchChange}
      />
    </ConfigForm>
  );
});

AntivirusRegistrationForm.displayName = 'AntivirusRegistrationForm';
