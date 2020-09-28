/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { EuiFieldText, EuiText, EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { cloneDeep } from 'lodash';
import { policyConfig } from '../store/policy_details/selectors';
import { usePolicyDetailsSelector } from './policy_hooks';

function setValue(obj: Record<string, unknown>, value: string, path: string[]) {
  let newPolicyConfig = obj;
  for (let i = 0; i < path.length - 1; i++) {
    newPolicyConfig = newPolicyConfig[path[i]] as Record<string, unknown>;
  }
  newPolicyConfig[path[path.length - 1]] = value;
}

function getValue(obj: Record<string, unknown>, path: string[]) {
  let currentPolicyConfig = obj;

  for (let i = 0; i < path.length - 1; i++) {
    currentPolicyConfig = currentPolicyConfig[path[i]] as Record<string, unknown>;
  }
  return currentPolicyConfig[path[path.length - 1]];
}

export const PolicyAdvanced = React.memo(
  ({
    configPath,
    firstSupportedVersion,
    lastSupportedVersion,
  }: {
    configPath: string[];
    firstSupportedVersion: string;
    lastSupportedVersion?: string;
  }) => {
    const dispatch = useDispatch();
    const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
    const onChange = useCallback(
      (event) => {
        if (policyDetailsConfig) {
          const newPayload = cloneDeep(policyDetailsConfig);

          setValue(
            (newPayload as unknown) as Record<string, unknown>,
            event.target.value,
            configPath
          );
          dispatch({
            type: 'userChangedPolicyConfig',
            payload: { policyConfig: newPayload },
          });
        }
      },
      [dispatch, policyDetailsConfig, configPath]
    );

    const value =
      policyDetailsConfig &&
      getValue((policyDetailsConfig as unknown) as Record<string, unknown>, configPath);

    return (
      <>
        <EuiText>
          <h1>
            <FormattedMessage
              id="xpack.securitySolution.policyAdvanced.field"
              defaultMessage={configPath.join('.')}
            />
          </h1>
        </EuiText>
        <EuiIconTip
          type="iInCircle"
          content={
            lastSupportedVersion
              ? `${firstSupportedVersion}-${lastSupportedVersion}`
              : `${firstSupportedVersion}+`
          }
        />
        <EuiFieldText value={value as string} onChange={onChange} />
      </>
    );
  }
);
PolicyAdvanced.displayName = 'PolicyAdvanced';
