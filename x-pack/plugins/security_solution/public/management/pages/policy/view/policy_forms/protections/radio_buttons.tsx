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
  Immutable,
  ImmutableArray,
  OperatingSystem,
  PolicyConfig,
  ProtectionModes,
  UIPolicyConfig,
} from '../../../../../../../common/endpoint/types';
// need to remove this eventually?
import { MalwareProtectionOSes, OS } from '../../../types';
import { useLicense } from '../../../../../../common/hooks/use_license';
import { AppAction } from '../../../../../../common/store/actions';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { policyConfig } from '../../../store/policy_details/selectors';

// const OSes: Immutable<MalwareProtectionOSes[]> = [OS.windows, OS.mac];
//

// type Aprotection = 'malware' | 'ransomware';
type Aprotection =
  | Pick<PolicyConfig['windows'], 'malware' | 'ransomware'>
  | Pick<PolicyConfig['mac'], 'malware'>;

// const a: Aprotection = '';

const ProtectionRadio = React.memo(
  ({
    protection,
    protectionMode,
    oses,
    label,
  }: {
    protection: Aprotection;
    protectionMode: ProtectionModes;
    oses: ImmutableArray<Partial<keyof UIPolicyConfig>>;
    label: string;
  }) => {
    const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
    const dispatch = useDispatch<(action: AppAction) => void>();
    const radioButtonId = useMemo(() => htmlIdGenerator()(), []);
    // currently just taking windows.malware, but both windows.malware and mac.malware should be the same value
    const selected = policyDetailsConfig && policyDetailsConfig.windows[protection].mode;
    const isPlatinumPlus = useLicense().isPlatinumPlus();

    const handleRadioChange = useCallback(() => {
      if (policyDetailsConfig) {
        const newPayload = cloneDeep(policyDetailsConfig);
        for (const os of oses) {
          newPayload[os][protection].mode = protectionMode;
          if (isPlatinumPlus) {
            if (protectionMode === ProtectionModes.prevent) {
              newPayload[os].popup[protection].enabled = true;
            } else {
              newPayload[os].popup[protection].enabled = false;
            }
          }
        }
        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: newPayload },
        });
      }
    }, [dispatch, protectionMode, policyDetailsConfig, isPlatinumPlus, oses, protection]);

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
