/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { policyConfig } from '../store/policy_details/selectors';
import { usePolicyDetailsSelector } from './policy_hooks';
import { AdvancedPolicySchema } from '../models/advanced_policy_schema';

function setValue(obj: Record<string, unknown>, value: string, path: string[]) {
  let newPolicyConfig = obj;

  // First set the value.
  for (let i = 0; i < path.length - 1; i++) {
    if (!newPolicyConfig[path[i]]) {
      newPolicyConfig[path[i]] = {} as Record<string, unknown>;
    }
    newPolicyConfig = newPolicyConfig[path[i]] as Record<string, unknown>;
  }
  newPolicyConfig[path[path.length - 1]] = value;

  // Then, if the user is deleting the value, we need to ensure we clean up the config.
  // We delete any sections that are empty, whether that be an empty string, empty object, or undefined.
  if (value === '' || value === undefined) {
    newPolicyConfig = obj;
    for (let k = path.length; k >= 0; k--) {
      const nextPath = path.slice(0, k);
      for (let i = 0; i < nextPath.length - 1; i++) {
        // Traverse and find the next section
        newPolicyConfig = newPolicyConfig[nextPath[i]] as Record<string, unknown>;
      }
      if (
        newPolicyConfig[nextPath[nextPath.length - 1]] === undefined ||
        newPolicyConfig[nextPath[nextPath.length - 1]] === '' ||
        Object.keys(newPolicyConfig[nextPath[nextPath.length - 1]] as object).length === 0
      ) {
        // If we're looking at the `advanced` field, we leave it undefined as opposed to deleting it.
        // This is because the UI looks for this field to begin rendering.
        if (nextPath[nextPath.length - 1] === 'advanced') {
          newPolicyConfig[nextPath[nextPath.length - 1]] = undefined;
          // In all other cases, if field is empty, we'll delete it to clean up.
        } else {
          delete newPolicyConfig[nextPath[nextPath.length - 1]];
        }
        newPolicyConfig = obj;
      } else {
        break; // We are looking at a non-empty section, so we can terminate.
      }
    }
  }
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
const calloutTitle = i18n.translate(
  'xpack.securitySolution.endpoint.policy.advanced.calloutTitle',
  {
    defaultMessage: 'Proceed with caution!',
  }
);
const warningMessage = i18n.translate(
  'xpack.securitySolution.endpoint.policy.advanced.warningMessage',
  {
    defaultMessage: `This section contains policy values that support advanced use cases. If not configured
    properly, these values can cause unpredictable behavior. Please consult documentation
    carefully or contact support before editing these values.`,
  }
);

export const AdvancedPolicyForms = React.memo(() => {
  return (
    <>
      <EuiCallOut title={calloutTitle} color="warning" iconType="alert">
        <p>{warningMessage}</p>
      </EuiCallOut>
      <EuiSpacer />
      <EuiText size="xs" color="subdued">
        <h4>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.advanced"
            defaultMessage="Advanced settings"
          />
        </h4>
      </EuiText>
      <EuiPanel data-test-subj="advancedPolicyPanel" paddingSize="s">
        {AdvancedPolicySchema.map((advancedField, index) => {
          const configPath = advancedField.key.split('.');
          return (
            <PolicyAdvanced
              key={index}
              configPath={configPath}
              firstSupportedVersion={advancedField.first_supported_version}
              lastSupportedVersion={advancedField.last_supported_version}
              documentation={advancedField.documentation}
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
    documentation,
  }: {
    configPath: string[];
    firstSupportedVersion: string;
    lastSupportedVersion?: string;
    documentation: string;
  }) => {
    const dispatch = useDispatch();
    const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
    const onChange = useCallback(
      (event) => {
        if (policyDetailsConfig) {
          const newPayload = cloneDeep(policyDetailsConfig);
          setValue(
            newPayload as unknown as Record<string, unknown>,
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
      getValue(policyDetailsConfig as unknown as Record<string, unknown>, configPath);

    return (
      <>
        <EuiFormRow
          fullWidth
          label={
            <EuiFlexGroup responsive={false}>
              <EuiFlexItem grow={true}>{configPath.join('.')}</EuiFlexItem>
              {documentation && (
                <EuiFlexItem grow={false}>
                  <EuiIconTip content={documentation} position="right" />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
          labelAppend={
            <EuiText size="xs">
              {lastSupportedVersion
                ? `${firstSupportedVersion}-${lastSupportedVersion}`
                : `${firstSupportedVersion}+`}
            </EuiText>
          }
        >
          <EuiFieldText
            data-test-subj={configPath.join('.')}
            fullWidth
            value={value as string}
            onChange={onChange}
          />
        </EuiFormRow>
      </>
    );
  }
);

PolicyAdvanced.displayName = 'PolicyAdvanced';
