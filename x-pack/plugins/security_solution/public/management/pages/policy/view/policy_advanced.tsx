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

export const PolicyAdvanced = React.memo(() => {
  const dispatch = useDispatch();
  // debugger;
  const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
  // console.log(policyDetailsConfig);
  const OSes: Immutable<AdvancedOSes[]> = [OS.windows, OS.linux, OS.mac];
  const onVerifyPeerChange = useCallback(
    (event) => {
      if (policyDetailsConfig) {
        const newPayload = cloneDeep(policyDetailsConfig);
        for (const os of OSes) {
          newPayload[os].advanced.elasticsearch.tls.verify_peer = event.target.value;
        }
        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: newPayload },
        });
      }
    },
    [dispatch, OSes, policyDetailsConfig]
  );

  const onVerifyHostnameChange = useCallback(
    (event) => {
      if (policyDetailsConfig) {
        const newPayload = cloneDeep(policyDetailsConfig);
        for (const os of OSes) {
          newPayload[os].advanced.elasticsearch.tls.verify_hostname = event.target.value;
        }
        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: newPayload },
        });
      }
    },
    [dispatch, OSes, policyDetailsConfig]
  );

  const verifyPeerValue =
    policyDetailsConfig && policyDetailsConfig.windows.advanced.elasticsearch.tls.verify_peer;
  const verifyHostnameValue =
    policyDetailsConfig && policyDetailsConfig.windows.advanced.elasticsearch.tls.verify_hostname;
  const onClick = useCallback(() => {
    dispatch({
      type: 'userClickedPolicyDetailsSaveButton',
    });
  }, [dispatch]);
  return (
    <WrapperPage>
      <EuiText>
        <h1>
          <FormattedMessage id="xpack.securitySolution.policyAdvanced.field" defaultMessage="hi!" />
        </h1>
      </EuiText>
      <EuiFieldText value={verifyPeerValue} onChange={onVerifyPeerChange} />
      <EuiFieldText value={verifyHostnameValue} onChange={onVerifyHostnameChange} />
      <EuiButton onClick={onClick}>
        <FormattedMessage
          id="xpack.securitySolution.policyAdvanced.submit"
          defaultMessage="Submit"
        />
      </EuiButton>
    </WrapperPage>
  );
});
PolicyAdvanced.displayName = 'PolicyAdvanced';
