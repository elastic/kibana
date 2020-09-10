/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { EuiButton, EuiFieldText, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { cloneDeep } from 'lodash';
import { Immutable } from '../../../../../common/endpoint/types';
import { WrapperPage } from '../../../../common/components/wrapper_page';
import { policyConfig } from '../store/policy_details/selectors';
import { usePolicyDetailsSelector } from './policy_hooks';
import { AdvancedOSes, OS } from '../types';

// function set(obj: Record<string, unknown>, value: unknown, firstPathPart: string, secondPathPart?: string, ...rest: string[]) {
//   if (secondPathPart === undefined) {
//       obj[firstPathPart] = value
//   } else {
//       set(obj[firstPathPart] as Record<string, unknown>, value, secondPathPart, ...rest)
//   }
// }

function setAgain(obj: Record<string, unknown>, value: string, path: string[]) {
  // console.log("path.length: ", path.length);
  let whatever = obj;
  for (let i = 0; i < path.length - 1; i++) {
    whatever = whatever[path[i]] as Record<string, unknown>;
  }
  whatever[path[path.length - 1]] = value;
}

function getValue(obj: Record<string, unknown>, path: string[]) {
  let whatever = obj;

  for (let i = 0; i < path.length - 1; i++) {
    whatever = whatever[path[i]] as Record<string, unknown>;
  }
  return whatever[path[path.length - 1]];
}

export const PolicyAdvanced = React.memo(({ configPath }: { configPath: string[] }) => {
  const dispatch = useDispatch();
  // debugger;
  const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
  // console.log(policyDetailsConfig);
  const OSes: Immutable<AdvancedOSes[]> = [OS.windows, OS.linux, OS.mac];
  // console.log("configPath: ", configPath);
  const onChange = useCallback(
    (event) => {
      // console.log(event.target.value)
      if (policyDetailsConfig) {
        const newPayload = cloneDeep(policyDetailsConfig);

        for (const os of OSes) {
          // console.log("configPath: ", configPath);
          setAgain(newPayload[os], event.target.value, configPath);
        }
        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: newPayload },
        });
      }
    },
    [dispatch, OSes, policyDetailsConfig, configPath]
  );

  const value = policyDetailsConfig && getValue(policyDetailsConfig.windows, configPath);
  // console.log(policyDetailsConfig);
  // console.log(configPath, value);

  return (
    <>
      <EuiText>
        <h1>
          <FormattedMessage
            id="xpack.securitySolution.policyAdvanced.field"
            defaultMessage={configPath[configPath.length - 1]}
          />
        </h1>
      </EuiText>
      <EuiFieldText value={value as string} onChange={onChange} />
    </>
  );
});
PolicyAdvanced.displayName = 'PolicyAdvanced';
