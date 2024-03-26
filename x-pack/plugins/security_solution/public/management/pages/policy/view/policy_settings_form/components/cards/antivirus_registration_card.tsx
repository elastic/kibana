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
import { useGetProtectionsUnavailableComponent } from '../../hooks/use_get_protections_unavailable_component';
import { useTestIdGenerator } from '../../../../../../hooks/use_test_id_generator';
import { SettingCard } from '../setting_card';
import type { PolicyFormComponentCommonProps } from '../../types';

const CARD_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.type',
  {
    defaultMessage: 'Register as antivirus',
  }
);

const DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.explanation',
  {
    defaultMessage:
      'Toggle on to register Elastic as an official Antivirus solution for Windows OS. ' +
      'This will also disable Windows Defender.',
  }
);

export const REGISTERED_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.type',
  {
    defaultMessage: 'Register as antivirus',
  }
);

export const NOT_REGISTERED_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.notRegisteredLabel',
  {
    defaultMessage: 'Do not register as antivirus',
  }
);

export type AntivirusRegistrationCardProps = PolicyFormComponentCommonProps;

export const AntivirusRegistrationCard = memo<AntivirusRegistrationCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isProtectionsAllowed = !useGetProtectionsUnavailableComponent();
    const isChecked = policy.windows.antivirus_registration.enabled;
    const isEditMode = mode === 'edit';
    const label = isChecked ? REGISTERED_LABEL : NOT_REGISTERED_LABEL;

    const handleSwitchChange = useCallback(
      (event) => {
        const updatedPolicy = cloneDeep(policy);
        updatedPolicy.windows.antivirus_registration.enabled = event.target.checked;

        onChange({ isValid: true, updatedPolicy });
      },
      [onChange, policy]
    );

    if (!isProtectionsAllowed) {
      return null;
    }

    return (
      <SettingCard
        type={CARD_TITLE}
        supportedOss={[OperatingSystem.WINDOWS]}
        dataTestSubj={getTestId()}
        osRestriction={i18n.translate(
          'xpack.securitySolution.endpoint.policy.details.av.windowsServerNotSupported',
          {
            defaultMessage:
              'Windows Server operating systems unsupported because Antivirus registration requires Windows Security Center, which is not included in Windows Server operating systems.',
          }
        )}
      >
        {isEditMode && <EuiText size="s">{DESCRIPTION}</EuiText>}

        <EuiSpacer size="s" />

        <EuiSwitch
          label={label}
          checked={isChecked}
          disabled={!isEditMode}
          onChange={handleSwitchChange}
          data-test-subj={getTestId('switch')}
        />
      </SettingCard>
    );
  }
);
AntivirusRegistrationCard.displayName = 'AntivirusRegistrationCard';
