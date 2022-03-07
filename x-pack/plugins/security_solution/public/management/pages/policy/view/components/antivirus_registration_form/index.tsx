/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';

import { OperatingSystem } from '@kbn/securitysolution-utils';
import { isAntivirusRegistrationEnabled } from '../../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { ConfigForm } from '../config_form';

const TRANSLATIONS: Readonly<{ [K in 'title' | 'description' | 'label']: string }> = {
  title: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.type',
    {
      defaultMessage: 'Register as antivirus',
    }
  ),
  description: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.explanation',
    {
      defaultMessage:
        'Toggle on to register Elastic as an official Antivirus solution for Windows OS. ' +
        'This will also disable Windows Defender.',
    }
  ),
  label: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.toggle',
    {
      defaultMessage: 'Register as antivirus',
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
    <ConfigForm
      type={TRANSLATIONS.title}
      supportedOss={[OperatingSystem.WINDOWS]}
      osRestriction={i18n.translate(
        'xpack.securitySolution.endpoint.policy.details.av.windowsServerNotSupported',
        { defaultMessage: 'Windows Server operating systems unsupported' }
      )}
    >
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
