/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import { useGetProtectionsUnavailableComponent } from '../../hooks/use_get_protections_unavailable_component';
import { useTestIdGenerator } from '../../../../../../hooks/use_test_id_generator';
import { useLicense } from '../../../../../../../common/hooks/use_license';
import { SettingLockedCard } from '../setting_locked_card';
import type { PolicyFormComponentCommonProps } from '../../types';
import { SettingCard } from '../setting_card';

const ATTACK_SURFACE_OS_LIST = [OperatingSystem.WINDOWS];

export const LOCKED_CARD_ATTACK_SURFACE_REDUCTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.attack_surface_reduction',
  {
    defaultMessage: 'Attack Surface Reduction',
  }
);

const CARD_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.attackSurfaceReduction.type',
  {
    defaultMessage: 'Attack surface reduction',
  }
);

export const SWITCH_ENABLED_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.credentialHardening.toggleEnabled',
  {
    defaultMessage: 'Credential hardening enabled',
  }
);

export const SWITCH_DISABLED_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.credentialHardening.toggleDisabled',
  {
    defaultMessage: 'Credential hardening disabled',
  }
);

export type AttackSurfaceReductionCardProps = PolicyFormComponentCommonProps;

export const AttackSurfaceReductionCard = memo<AttackSurfaceReductionCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isProtectionsAllowed = !useGetProtectionsUnavailableComponent();
    const isChecked = policy.windows.attack_surface_reduction.credential_hardening.enabled;
    const isEditMode = mode === 'edit';
    const label = isChecked ? SWITCH_ENABLED_LABEL : SWITCH_DISABLED_LABEL;

    const handleSwitchChange = useCallback(
      (event) => {
        const updatedPolicy = cloneDeep(policy);

        updatedPolicy.windows.attack_surface_reduction.credential_hardening.enabled =
          event.target.checked;

        onChange({ isValid: true, updatedPolicy });
      },
      [onChange, policy]
    );

    if (!isProtectionsAllowed) {
      return null;
    }

    if (!isPlatinumPlus) {
      return (
        <SettingLockedCard
          title={LOCKED_CARD_ATTACK_SURFACE_REDUCTION}
          data-test-subj={getTestId('locked')}
        />
      );
    }

    return (
      <SettingCard
        type={CARD_TITLE}
        supportedOss={ATTACK_SURFACE_OS_LIST}
        dataTestSubj={getTestId()}
      >
        {isEditMode ? (
          <EuiSwitch
            label={label}
            checked={isChecked}
            onChange={handleSwitchChange}
            data-test-subj={getTestId('enableDisableSwitch')}
          />
        ) : (
          <span data-test-subj={getTestId('valueLabel')}>{label}</span>
        )}
      </SettingCard>
    );
  }
);
AttackSurfaceReductionCard.displayName = 'AttackSurfaceReductionCard';
