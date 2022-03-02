/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiEmptyPrompt, EuiButton, EuiPageTemplate } from '@elastic/eui';
import { useGetLinkTo } from './use_policy_artifacts_empty_hooks';
import { POLICY_ARTIFACT_EMPTY_UNEXISTING_LABELS } from './translations';

interface CommonProps {
  policyId: string;
  policyName: string;
  listId: string;
  labels: typeof POLICY_ARTIFACT_EMPTY_UNEXISTING_LABELS;
}

export const PolicyArtifactsEmptyUnexisting = memo<CommonProps>(
  ({ policyId, policyName, listId, labels }) => {
    const { onClickHandler, toRouteUrl } = useGetLinkTo(policyId, policyName, listId, {
      show: 'create',
    });
    return (
      <EuiPageTemplate template="centeredContent">
        <EuiEmptyPrompt
          iconType="plusInCircle"
          data-test-subj="policy-artifacts-empty-unexisting"
          title={<h2>{labels.emptyUnexistingTitle}</h2>}
          body={labels.emptyUnexistingMessage}
          actions={
            // eslint-disable-next-line @elastic/eui/href-or-on-click
            <EuiButton color="primary" fill onClick={onClickHandler} href={toRouteUrl}>
              {labels.emptyUnexistingPrimaryActionButtonTitle}
            </EuiButton>
          }
        />
      </EuiPageTemplate>
    );
  }
);

PolicyArtifactsEmptyUnexisting.displayName = 'PolicyArtifactsEmptyUnexisting';
