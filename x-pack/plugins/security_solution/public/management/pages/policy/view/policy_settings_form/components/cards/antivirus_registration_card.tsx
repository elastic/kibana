/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEventHandler } from 'react';
import React, { memo, useMemo } from 'react';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiRadio, EuiSpacer, EuiText } from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { shouldEnableAntivirusRegistrationForSync } from '../../../../../../../../common/endpoint/utils/update_antivirus_registration_enabled';
import { AntivirusRegistrationModes } from '../../../../../../../../common/endpoint/types';
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
      'Enable to register Elastic as an official Antivirus solution for Windows OS. ' +
      'This will also disable Windows Defender.',
  }
);

const ENABLED = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.syncWithMalwarePrevent.enabled',
  { defaultMessage: 'enabled' }
);

const DISABLED = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.syncWithMalwarePrevent.enabled',
  { defaultMessage: 'disabled' }
);

export type AntivirusRegistrationCardProps = PolicyFormComponentCommonProps;

export const AntivirusRegistrationCard = memo<AntivirusRegistrationCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isProtectionsAllowed = !useGetProtectionsUnavailableComponent();

    let currentMode: AntivirusRegistrationModes;
    if (policy.windows.antivirus_registration.mode) {
      currentMode = policy.windows.antivirus_registration.mode;
    } else {
      currentMode = policy.windows.antivirus_registration.enabled
        ? AntivirusRegistrationModes.enabled
        : AntivirusRegistrationModes.disabled;
    }

    const labels: Record<AntivirusRegistrationModes, React.ReactNode> = useMemo(
      () => ({
        [AntivirusRegistrationModes.disabled]: i18n.translate(
          'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.disabled',
          { defaultMessage: 'Disabled' }
        ),
        [AntivirusRegistrationModes.enabled]: i18n.translate(
          'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.enabled',
          { defaultMessage: 'Enabled' }
        ),
        [AntivirusRegistrationModes.sync]: (
          <>
            <EuiText size="s">
              {i18n.translate(
                'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.syncWithMalwarePrevent',
                { defaultMessage: 'Sync with Malware protection level' }
              )}{' '}
              <EuiIconTip
                position="right"
                content={i18n.translate(
                  'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.syncWithMalwarePreventTooltip',
                  {
                    defaultMessage:
                      'Using this setting will automatically enable antivirus registration if Malware protection is set to prevent. ' +
                      'In any other cases antivirus registration will be disabled.',
                  }
                )}
              />
            </EuiText>
            <EuiText color="subdued" size="xs">
              {i18n.translate(
                'xpack.securitySolution.endpoint.policy.details.antivirusRegistration.syncWithMalwarePrevent.currentOutcome',
                {
                  defaultMessage: '(with current Malware settings: {currentOutcome})',
                  values: {
                    currentOutcome: shouldEnableAntivirusRegistrationForSync(policy)
                      ? ENABLED
                      : DISABLED,
                  },
                }
              )}
            </EuiText>
          </>
        ),
      }),
      [policy]
    );

    const isEditMode = mode === 'edit';

    const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
      const updatedPolicy = cloneDeep(policy);
      updatedPolicy.windows.antivirus_registration.mode = event.target
        .value as AntivirusRegistrationModes;

      onChange({ isValid: true, updatedPolicy });
    };

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

        <EuiFlexGroup data-test-subj={getTestId('radioButtons')}>
          {Object.values(AntivirusRegistrationModes).map((registrationMode) => (
            <EuiFlexItem key={registrationMode}>
              <EuiRadio
                name="antivirus-registration"
                id={registrationMode}
                value={registrationMode}
                onChange={handleChange}
                label={labels[registrationMode as AntivirusRegistrationModes]}
                checked={currentMode === registrationMode}
                disabled={!isEditMode}
                data-test-subj={getTestId(registrationMode)}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </SettingCard>
    );
  }
);
AntivirusRegistrationCard.displayName = 'AntivirusRegistrationCard';
