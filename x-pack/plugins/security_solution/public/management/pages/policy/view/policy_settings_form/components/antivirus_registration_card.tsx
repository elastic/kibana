/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { SettingCard } from './setting_card';
import type { PolicyFormComponentCommonProps } from '../types';

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
    'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.registeredLabel',
    {
      defaultMessage: 'Register as antivirus',
    }
  ),
};

const DO_NOT_REGISTER_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.notRegisteredLabel',
  {
    defaultMessage: 'Do not register as antivirus',
  }
);

type AntivirusRegistrationCardProps = PolicyFormComponentCommonProps;

export const AntivirusRegistrationCard = memo<AntivirusRegistrationCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const isChecked = policy.windows.antivirus_registration.enabled;
    const isEditMode = mode === 'edit';
    const label = isChecked ? TRANSLATIONS.label : DO_NOT_REGISTER_LABEL;

    const handleSwitchChange = useCallback(
      (event) => {
        const updatedPolicy = cloneDeep(policy);
        updatedPolicy.windows.antivirus_registration.enabled = event.target.checked;

        onChange({ isValid: true, updatedPolicy });
      },
      [onChange, policy]
    );

    return (
      <SettingCard
        type={TRANSLATIONS.title}
        supportedOss={[OperatingSystem.WINDOWS]}
        dataTestSubj="antivirusRegistrationForm"
        osRestriction={i18n.translate(
          'xpack.securitySolution.endpoint.policy.details.av.windowsServerNotSupported',
          {
            defaultMessage:
              'Windows Server operating systems unsupported because Antivirus registration requires Windows Security Center, which is not included in Windows Server operating systems.',
          }
        )}
      >
        {isEditMode && <EuiText size="s">{TRANSLATIONS.description}</EuiText>}

        <EuiSpacer size="s" />

        {isEditMode ? (
          <EuiSwitch label={label} checked={isChecked} onChange={handleSwitchChange} />
        ) : (
          <div>{label}</div>
        )}
      </SettingCard>
    );
  }
);
AntivirusRegistrationCard.displayName = 'AntivirusRegistrationCard';
