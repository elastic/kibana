/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { cloneDeep } from 'lodash';
import { htmlIdGenerator, EuiRadio } from '@elastic/eui';
import {
  ImmutableArray,
  ProtectionModes,
  UIPolicyConfig,
} from '../../../../../../../common/endpoint/types';
import { MacPolicyProtection, LinuxPolicyProtection, PolicyProtection } from '../../../types';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { policyConfig } from '../../../store/policy_details/selectors';
import { AppAction } from '../../../../../../common/store/actions';
import { useLicense } from '../../../../../../common/hooks/use_license';

export const ProtectionRadio = React.memo(
  ({
    protection,
    protectionMode,
    osList,
    label,
  }: {
    protection: PolicyProtection;
    protectionMode: ProtectionModes;
    osList: ImmutableArray<Partial<keyof UIPolicyConfig>>;
    label: string;
  }) => {
    const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
    const dispatch = useDispatch<(action: AppAction) => void>();
    const radioButtonId = useMemo(() => htmlIdGenerator()(), []);
    const selected = policyDetailsConfig && policyDetailsConfig.windows[protection].mode;
    const isPlatinumPlus = useLicense().isPlatinumPlus();

    const handleRadioChange = useCallback(() => {
      if (policyDetailsConfig) {
        const newPayload = cloneDeep(policyDetailsConfig);
        for (const os of osList) {
          if (os === 'windows') {
            newPayload[os][protection].mode = protectionMode;
          } else if (os === 'mac') {
            newPayload[os][protection as MacPolicyProtection].mode = protectionMode;
          } else if (os === 'linux') {
            newPayload[os][protection as LinuxPolicyProtection].mode = protectionMode;
          }
          if (isPlatinumPlus) {
            if (os === 'windows') {
              if (protectionMode === ProtectionModes.prevent) {
                newPayload[os].popup[protection].enabled = true;
              } else {
                newPayload[os].popup[protection].enabled = false;
              }
            } else if (os === 'mac') {
              if (protectionMode === ProtectionModes.prevent) {
                newPayload[os].popup[protection as MacPolicyProtection].enabled = true;
              } else {
                newPayload[os].popup[protection as MacPolicyProtection].enabled = false;
              }
            } else if (os === 'linux') {
              if (protectionMode === ProtectionModes.prevent) {
                newPayload[os].popup[protection as LinuxPolicyProtection].enabled = true;
              } else {
                newPayload[os].popup[protection as LinuxPolicyProtection].enabled = false;
              }
            }
          }
        }
        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: newPayload },
        });
      }
    }, [dispatch, protectionMode, policyDetailsConfig, isPlatinumPlus, osList, protection]);

    /**
     *  Passing an arbitrary id because EuiRadio
     *  requires an id if label is passed
     */

    return (
      <EuiRadio
        className="policyDetailsProtectionRadio"
        label={label}
        id={radioButtonId}
        checked={selected === protectionMode}
        onChange={handleRadioChange}
        disabled={selected === ProtectionModes.off}
      />
    );
  }
);

ProtectionRadio.displayName = 'ProtectionRadio';
