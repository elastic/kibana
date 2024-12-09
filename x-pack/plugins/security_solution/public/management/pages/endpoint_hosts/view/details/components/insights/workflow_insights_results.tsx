/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import {
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { WORKFLOW_INSIGHTS } from '../../../translations';

interface WorkflowInsightsResultsProps {
  results: boolean;
}

const CustomEuiCallOut = styled(EuiCallOut)`
  & .euiButtonIcon {
    margin-top: 5px; /* Lower the close button */
  }
`;

export const WorkflowInsightsResults = ({ results }: WorkflowInsightsResultsProps) => {
  const [showEmptyResultsCallout, setShowEmptyResultsCallout] = useState(true);
  const hideEmptyStateCallout = () => setShowEmptyResultsCallout(false);
  if (!results) {
    return null;
  }

  return (
    <>
      <EuiText size={'s'}>
        <h4>{WORKFLOW_INSIGHTS.issues.title}</h4>
      </EuiText>
      <EuiSpacer size={'s'} />
      <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
        <EuiFlexGroup alignItems={'center'} gutterSize={'m'}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="warning" size="l" color="warning" />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiText size="s">
              <EuiText size={'s'}>
                <strong>{'McAfee EndpointSecurity'}</strong>
              </EuiText>
              <EuiText size={'s'} color={'subdued'}>
                {'Add McAfee as a trusted application'}
              </EuiText>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
            <EuiButtonIcon
              iconType="popout"
              aria-label="External link"
              href="https://google.com"
              target="_blank"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {showEmptyResultsCallout && (
        <CustomEuiCallOut onDismiss={hideEmptyStateCallout} color={'success'}>
          {WORKFLOW_INSIGHTS.issues.emptyResults}
        </CustomEuiCallOut>
      )}
    </>
  );
};
