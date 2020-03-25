/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiTitle,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { usePolicyDetailsSelector } from './policy_hooks';
import { policyDetails } from '../../store/policy_details/selectors';
import { WindowsEventing } from './policy_forms/eventing/windows';

export const PolicyDetails = React.memo(() => {
  const policyItem = usePolicyDetailsSelector(policyDetails);

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
    <EuiPage data-test-subj="policyDetailsPage">
      <EuiPageBody>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="m">
              <h1 data-test-subj="policyDetailsViewTitle">{policyName()}</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty>Cancel</EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill={true} iconType="save">
                Save
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageHeader>
        <EuiText size="xs" color="subdued">
          <h4>Settings</h4>
        </EuiText>
        <EuiSpacer size="xs" />
        <WindowsEventing />
      </EuiPageBody>
    </EuiPage>
  );
});
