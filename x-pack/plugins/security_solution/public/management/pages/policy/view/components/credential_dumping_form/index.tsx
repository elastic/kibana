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
import { isCredentialDumpingEnabled } from '../../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { ConfigForm } from '../config_form';

const TRANSLATIONS: Readonly<{ [K in 'title' | 'description' | 'label']: string }> = {
  title: i18n.translate('xpack.securitySolution.endpoint.policy.details.credentialDumping.type', {
    defaultMessage: 'Credential dumping',
  }),
  description: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.credentialDumping.explanation',
    {
      defaultMessage: 'Toggle on to enable credential dumping.',
    }
  ),
  label: i18n.translate('xpack.securitySolution.endpoint.policy.details.credentialDumping.toggle', {
    defaultMessage: 'Credential dumping',
  }),
};

export const CredentialDumpingForm = memo(() => {
  const credentialDumpingEnabled = usePolicyDetailsSelector(isCredentialDumpingEnabled);
  const dispatch = useDispatch();

  const handleSwitchChange = useCallback(
    (event) =>
      dispatch({
        type: 'userChangedCredentialDumping',
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
        checked={credentialDumpingEnabled}
        onChange={handleSwitchChange}
      />
    </ConfigForm>
  );
});

CredentialDumpingForm.displayName = 'CredentialDumpingForm';
