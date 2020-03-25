/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { usePolicyDetailsSelector } from './policy_hooks';
import {
  selectAgentStatusSummary,
  selectPolicyDetails,
} from '../../store/policy_details/selectors';
import { AppAction } from '../../types';
import { AgentsSummary } from './agents_summary';

export const PolicyDetails = React.memo(() => {
  const dispatch = useDispatch<(action: AppAction) => void>();
  const policyItem = usePolicyDetailsSelector(selectPolicyDetails);

  const agentStatusSummary = usePolicyDetailsSelector(selectAgentStatusSummary);

  const handleSaveOnClick = useCallback(() => {
    dispatch({
      type: 'userClickedPolicyDetailsSaveButton',
    });
  }, [dispatch]);

  function policyName() {
    if (policyItem) {
      return <span data-test-subj="policyDetailsName">{policyItem.name}</span>;
    } else {
      return (
        <span data-test-subj="policyDetailsNotFound">
          <FormattedMessage
            id="xpack.endpoint.policyDetails.notFound"
            defaultMessage="Policy Not Found"
          />
        </span>
      );
    }
  }

  return (
    <>
      <EuiTitle size="l">
        <h1 data-test-subj="policyDetailsViewTitle">{policyName()}</h1>
      </EuiTitle>
      <div style={{ margin: '4em', padding: '4em' }}>
        <AgentsSummary {...agentStatusSummary} />
      </div>
      <EuiButton fill iconType="save" onClick={handleSaveOnClick}>
        Save
      </EuiButton>
    </>
  );
});
