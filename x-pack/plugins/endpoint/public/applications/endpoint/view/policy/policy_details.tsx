/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { usePolicyDetailsSelector } from './policy_hooks';
import { selectPolicyDetails } from '../../store/policy_details/selectors';
import { WindowsEventing } from './policy_forms/eventing/windows';

export const PolicyDetails = React.memo(() => {
  const policyItem = usePolicyDetailsSelector(selectPolicyDetails);

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
      <WindowsEventing />
    </>
  );
});
