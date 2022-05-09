/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiSwitch } from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { useLicense } from '../../../../../../common/hooks/use_license';
import { policyConfig } from '../../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { AppAction } from '../../../../../../common/store/actions';
import {
  ImmutableArray,
  ProtectionModes,
  UIPolicyConfig,
  AdditionalOnSwitchChangeParams,
} from '../../../../../../../common/endpoint/types';
import { PolicyProtection, MacPolicyProtection, LinuxPolicyProtection } from '../../../types';

export const ProtectionSwitch = React.memo(
  ({
    protection,
    protectionLabel,
    osList,
    additionalOnSwitchChange,
  }: {
    protection: PolicyProtection;
    protectionLabel?: string;
    osList: ImmutableArray<Partial<keyof UIPolicyConfig>>;
    additionalOnSwitchChange?: ({
      value,
      policyConfigData,
      protectionOsList,
    }: AdditionalOnSwitchChangeParams) => UIPolicyConfig;
  }) => {
    const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const dispatch = useDispatch<(action: AppAction) => void>();
    const selected = policyDetailsConfig && policyDetailsConfig.windows[protection].mode;

    const handleSwitchChange = useCallback(
      (event) => {
        if (policyDetailsConfig) {
          const newPayload = cloneDeep(policyDetailsConfig);
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
          if (additionalOnSwitchChange) {
            dispatch({
              type: 'userChangedPolicyConfig',
              payload: {
                policyConfig: additionalOnSwitchChange({
                  value: event.target.checked,
                  policyConfigData: newPayload,
                  protectionOsList: osList,
                }),
              },
            });
          } else {
            dispatch({
              type: 'userChangedPolicyConfig',
              payload: { policyConfig: newPayload },
            });
          }
        }
      },
      [dispatch, policyDetailsConfig, isPlatinumPlus, protection, osList, additionalOnSwitchChange]
    );

    return (
      <EuiSwitch
        label={i18n.translate('xpack.securitySolution.endpoint.policy.details.protectionsEnabled', {
          defaultMessage: '{protectionLabel} {mode, select, true {enabled} false {disabled}}',
          values: {
            protectionLabel,
            mode: selected !== ProtectionModes.off,
          },
        })}
        checked={selected !== ProtectionModes.off}
        onChange={handleSwitchChange}
      />
    );
  }
);

ProtectionSwitch.displayName = 'ProtectionSwitch';
