/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { EuiFieldText, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Immutable } from '../../../../../common/endpoint/types';
import { WrapperPage } from '../../../../common/components/wrapper_page';
import { policyConfig } from '../store/policy_details/selectors';
import { usePolicyDetailsSelector } from './policy_hooks';
import { clone } from '../models/policy_details_config';
import { AdvancedOSes, OS } from '../types';

export const PolicyAdvanced = React.memo(() => {
  const dispatch = useDispatch();
  // debugger;
  const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
  // console.log(policyDetailsConfig);
  const OSes: Immutable<AdvancedOSes[]> = [OS.windows, OS.linux, OS.mac];
  const onChange = useCallback(
    (event) => {
      if (policyDetailsConfig) {
        const newPayload = clone(policyDetailsConfig);
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

  const value =
    policyDetailsConfig && policyDetailsConfig.windows.advanced.elasticsearch.tls.verify_peer;
  return (
    <WrapperPage>
      <EuiText>
        <h1>
          <FormattedMessage id="xpack.securitySolution.policyAdvanced.field" defaultMessage="hi!" />
        </h1>
      </EuiText>
      <EuiFieldText value={value} onChange={onChange} />
    </WrapperPage>
  );
});
PolicyAdvanced.displayName = 'PolicyAdvanced';
