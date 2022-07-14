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
import { isCredentialHardeningEnabled } from '../../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { ConfigForm } from '../config_form';

const TRANSLATIONS: Readonly<{ [K in 'title' | 'description' | 'label']: string }> = {
  title: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.attackSurfaceReduction.type',
    {
      defaultMessage: 'Attack surface reduction',
    }
  ),
  description: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.attackSurfaceReduction.explanation',
    {
      defaultMessage: 'Options to reduce your attack surface',
    }
  ),
  label: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.credentialHardening.toggle',
    {
      defaultMessage: 'Credential hardening',
    }
  ),
};

export const AttackSurfaceReductionForm = memo(() => {
  const credentialHardeningEnabled = usePolicyDetailsSelector(isCredentialHardeningEnabled);
  const dispatch = useDispatch();

  const handleSwitchChange = useCallback(
    (event) =>
      dispatch({
        type: 'userChangedcredentialHardening',
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
        checked={credentialHardeningEnabled}
        onChange={handleSwitchChange}
      />
    </ConfigForm>
  );
});

AttackSurfaceReductionForm.displayName = 'AttackSurfaceReductionForm';
