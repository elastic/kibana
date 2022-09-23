/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiEmptyPrompt,
  EuiButton,
  EuiPageTemplate_Deprecated as EuiPageTemplate,
} from '@elastic/eui';
import { useGetLinkTo } from './use_policy_artifacts_empty_hooks';
import type { POLICY_ARTIFACT_EMPTY_UNEXISTING_LABELS } from './translations';
import type { EventFiltersPageLocation } from '../../../../event_filters/types';
import type { ArtifactListPageUrlParams } from '../../../../../components/artifact_list_page';

interface CommonProps {
  policyId: string;
  policyName: string;
  labels: typeof POLICY_ARTIFACT_EMPTY_UNEXISTING_LABELS;
  getPolicyArtifactsPath: (policyId: string) => string;
  getArtifactPath: (
    location?: Partial<EventFiltersPageLocation> | Partial<ArtifactListPageUrlParams>
  ) => string;
}

export const PolicyArtifactsEmptyUnexisting = memo<CommonProps>(
  ({ policyId, policyName, labels, getPolicyArtifactsPath, getArtifactPath }) => {
    const { onClickHandler, toRouteUrl } = useGetLinkTo(
      policyId,
      policyName,
      getPolicyArtifactsPath,
      getArtifactPath,
      {
        show: 'create',
      }
    );
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
