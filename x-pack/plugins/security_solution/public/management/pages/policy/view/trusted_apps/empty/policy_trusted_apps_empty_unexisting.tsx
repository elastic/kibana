/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiEmptyPrompt, EuiButton, EuiPageTemplate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useGetLinkTo } from './use_policy_trusted_apps_empty_hooks';

interface CommonProps {
  policyId: string;
  policyName: string;
}

export const PolicyTrustedAppsEmptyUnexisting = memo<CommonProps>(({ policyId, policyName }) => {
  const { onClickHandler, toRouteUrl } = useGetLinkTo(policyId, policyName);
  return (
    <EuiPageTemplate template="centeredContent">
      <EuiEmptyPrompt
        iconType="plusInCircle"
        data-test-subj="policy-trusted-apps-empty-unexisting"
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.trustedApps.empty.unexisting.title"
              defaultMessage="No trusted applications exist"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.trustedApps.empty.unexisting.content"
            defaultMessage="There are currently no trusted applications applied to your endpoints."
          />
        }
        actions={
          // eslint-disable-next-line @elastic/eui/href-or-on-click
          <EuiButton color="primary" fill onClick={onClickHandler} href={toRouteUrl}>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.trustedApps.empty.unexisting.action"
              defaultMessage="Add trusted application"
            />
          </EuiButton>
        }
      />
    </EuiPageTemplate>
  );
});

PolicyTrustedAppsEmptyUnexisting.displayName = 'PolicyTrustedAppsEmptyUnexisting';
