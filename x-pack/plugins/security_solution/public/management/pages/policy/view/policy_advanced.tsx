/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { EuiFieldText, EuiFormRow, EuiPanel, EuiText } from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { policyConfig } from '../store/policy_details/selectors';
import { usePolicyDetailsSelector } from './policy_hooks';
import { AdvancedPolicySchema } from '../models/advanced_policy_schema';

function setValue(obj: Record<string, unknown>, value: string, path: string[]) {
  let newPolicyConfig = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!newPolicyConfig[path[i]]) {
      newPolicyConfig[path[i]] = {} as Record<string, unknown>;
    }
    newPolicyConfig = newPolicyConfig[path[i]] as Record<string, unknown>;
  }
  newPolicyConfig[path[path.length - 1]] = value;
}

function getValue(obj: Record<string, unknown>, path: string[]) {
  let currentPolicyConfig = obj;

  for (let i = 0; i < path.length - 1; i++) {
    if (currentPolicyConfig[path[i]]) {
      currentPolicyConfig = currentPolicyConfig[path[i]] as Record<string, unknown>;
    } else {
      return undefined;
    }
  }
  return currentPolicyConfig[path[path.length - 1]];
}

export const AdvancedPolicyForms = React.memo(() => {
  return (
    <>
      <EuiText size="xs" color="subdued">
        <h4>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.advanced"
            defaultMessage="Advanced settings"
          />
        </h4>
      </EuiText>
      <EuiPanel paddingSize="s">
        {AdvancedPolicySchema.map((advancedField, index) => {
          const configPath = advancedField.key.split('.');
          return (
            <PolicyAdvanced
              key={index}
              configPath={configPath}
              firstSupportedVersion={advancedField.first_supported_version}
              lastSupportedVersion={advancedField.last_supported_version}
            />
          );
        })}
      </EuiPanel>
    </>
  );
});

AdvancedPolicyForms.displayName = 'AdvancedPolicyForms';

const PolicyAdvanced = React.memo(
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
        <EuiFormRow
          fullWidth
          label={configPath.join('.')}
          labelAppend={
            <EuiText size="xs">
              {lastSupportedVersion
                ? `${firstSupportedVersion}-${lastSupportedVersion}`
                : `${firstSupportedVersion}+`}
            </EuiText>
          }
        >
          <EuiFieldText fullWidth value={value as string} onChange={onChange} />
        </EuiFormRow>
      </>
    );
  }
);

PolicyAdvanced.displayName = 'PolicyAdvanced';
