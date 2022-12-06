/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiSwitch } from '@elastic/eui';

import { OperatingSystem } from '@kbn/securitysolution-utils';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { isCredentialHardeningEnabled } from '../../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { ConfigForm } from '../config_form';

const TRANSLATIONS: Readonly<{ [K in 'title' | 'label']: string }> = {
  title: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.attackSurfaceReduction.type',
    {
      defaultMessage: 'Attack surface reduction',
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
  const { canWritePolicyManagement } = useUserPrivileges().endpointPrivileges;

  const handleSwitchChange = useCallback(
    (event) =>
      dispatch({
        type: 'userChangedCredentialHardening',
        payload: {
          enabled: event.target.checked,
        },
      }),
    [dispatch]
  );

  return (
    <ConfigForm type={TRANSLATIONS.title} supportedOss={[OperatingSystem.WINDOWS]}>
      <EuiSwitch
        label={TRANSLATIONS.label}
        checked={credentialHardeningEnabled}
        onChange={handleSwitchChange}
        disabled={!canWritePolicyManagement}
      />
    </ConfigForm>
  );
});

AttackSurfaceReductionForm.displayName = 'AttackSurfaceReductionForm';
