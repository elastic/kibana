/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSwitch } from '@elastic/eui';
import { cloneDeep } from 'lodash';
import type { PolicyFormComponentCommonProps } from '../types';
import { useLicense } from '../../../../../../common/hooks/use_license';
import type {
  ImmutableArray,
  UIPolicyConfig,
  PolicyConfig,
} from '../../../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import type { PolicyProtection, MacPolicyProtection, LinuxPolicyProtection } from '../../../types';

export interface ProtectionSettingCardSwitchProps extends PolicyFormComponentCommonProps {
  protection: PolicyProtection;
  protectionLabel?: string;
  osList: ImmutableArray<Partial<keyof UIPolicyConfig>>;
  additionalOnSwitchChange?: ({
    value,
    policyConfigData,
    protectionOsList,
  }: {
    value: boolean;
    policyConfigData: PolicyConfig;
    protectionOsList: ImmutableArray<Partial<keyof UIPolicyConfig>>;
  }) => PolicyConfig;
}

export const ProtectionSettingCardSwitch = React.memo(
  ({
    protection,
    protectionLabel,
    osList,
    additionalOnSwitchChange,
    onChange,
    policy,
    mode,
    'data-test-subj': dataTestSubj,
  }: ProtectionSettingCardSwitchProps) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isEditMode = mode === 'edit';
    const selected = policy && policy.windows[protection].mode;
    const switchLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.details.protectionsEnabled',
      {
        defaultMessage: '{protectionLabel} {mode, select, true {enabled} false {disabled}}',
        values: {
          protectionLabel,
          mode: selected !== ProtectionModes.off,
        },
      }
    );

    const handleSwitchChange = useCallback(
      (event) => {
        const newPayload = cloneDeep(policy);

        if (event.target.checked === false) {
          for (const os of osList) {
            if (os === 'windows') {
              newPayload[os][protection].mode = ProtectionModes.off;
            } else if (os === 'mac') {
              newPayload[os][protection as MacPolicyProtection].mode = ProtectionModes.off;
            } else if (os === 'linux') {
              newPayload[os][protection as LinuxPolicyProtection].mode = ProtectionModes.off;
            }
            if (isPlatinumPlus) {
              if (os === 'windows') {
                newPayload[os].popup[protection].enabled = event.target.checked;
              } else if (os === 'mac') {
                newPayload[os].popup[protection as MacPolicyProtection].enabled =
                  event.target.checked;
              } else if (os === 'linux') {
                newPayload[os].popup[protection as LinuxPolicyProtection].enabled =
                  event.target.checked;
              }
              if (protection === 'behavior_protection') {
                newPayload.windows.behavior_protection.reputation_service = event.target.checked;
                newPayload.mac.behavior_protection.reputation_service = event.target.checked;
                newPayload.linux.behavior_protection.reputation_service = event.target.checked;
              }
            }
          }
        } else {
          for (const os of osList) {
            if (os === 'windows') {
              newPayload[os][protection].mode = ProtectionModes.prevent;
            } else if (os === 'mac') {
              newPayload[os][protection as MacPolicyProtection].mode = ProtectionModes.prevent;
            } else if (os === 'linux') {
              newPayload[os][protection as LinuxPolicyProtection].mode = ProtectionModes.prevent;
            }
            if (isPlatinumPlus) {
              if (protection === 'behavior_protection') {
                newPayload.windows.behavior_protection.reputation_service = false;
                newPayload.mac.behavior_protection.reputation_service = false;
                newPayload.linux.behavior_protection.reputation_service = false;
              }
              if (os === 'windows') {
                newPayload[os].popup[protection].enabled = event.target.checked;
              } else if (os === 'mac') {
                newPayload[os].popup[protection as MacPolicyProtection].enabled =
                  event.target.checked;
              } else if (os === 'linux') {
                newPayload[os].popup[protection as LinuxPolicyProtection].enabled =
                  event.target.checked;
              }
            }
          }
        }

        onChange({
          isValid: true,
          updatedPolicy: additionalOnSwitchChange
            ? additionalOnSwitchChange({
                value: event.target.checked,
                policyConfigData: newPayload,
                protectionOsList: osList,
              })
            : newPayload,
        });
      },
      [policy, onChange, additionalOnSwitchChange, osList, isPlatinumPlus, protection]
    );

    if (!isEditMode) {
      return <>{switchLabel}</>;
    }

    return (
      <EuiSwitch
        label={switchLabel}
        checked={selected !== ProtectionModes.off}
        onChange={handleSwitchChange}
        disabled={!isEditMode}
        data-test-subj={dataTestSubj}
      />
    );
  }
);

ProtectionSettingCardSwitch.displayName = 'ProtectionSettingCardSwitch';
