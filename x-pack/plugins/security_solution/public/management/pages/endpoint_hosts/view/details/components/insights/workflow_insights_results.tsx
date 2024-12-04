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
import type { EndpointInsightRouteState } from '../../../../types';
import { getEndpointDetailsPath } from '../../../../../../common/routing';
import { useKibana } from '../../../../../../../common/lib/kibana';
import { APP_PATH, TRUSTED_APPS_PATH } from '../../../../../../../../common/constants';

const CustomEuiCallOut = styled(EuiCallOut)`
  & .euiButtonIcon {
    margin-top: 5px; /* Lower the close button */
  }
`;

export const WorkflowInsightsResults = ({ results }: WorkflowInsightsResultsProps) => {
  const [showEmptyResultsCallout, setShowEmptyResultsCallout] = useState(true);
  const hideEmptyStateCallout = () => setShowEmptyResultsCallout(false);
  const {
    application: { navigateToUrl },
  } = useKibana().services;

  const openArtifactCreationPage = () => {
    const url = `${APP_PATH}${TRUSTED_APPS_PATH}?show=create`;
    const state: EndpointInsightRouteState = {
      insight: {
        back_url: `${APP_PATH}${getEndpointDetailsPath({
          name: 'endpointDetails',
          selected_endpoint: '69f8c984-56bb-4f5d-b6fc-2f5673d93ec9',
        })}`,
        item: {
          comments: [],
          description: 'Test',
          entries: [
            {
              field: 'process.hash.*',
              operator: 'included',
              type: 'match',
              value: 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d',
            },
          ],
          list_id: 'endpoint_trusted_apps',
          name: 'Test',
          namespace_type: 'agnostic',
          tags: ['policy:all'],
          type: 'simple',
          os_types: ['windows'],
        },
      },
    };
    navigateToUrl(url, {
      state,
    });
  };

  const onInsightClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    openArtifactCreationPage();
  };

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
              href={`${APP_PATH}${TRUSTED_APPS_PATH}?show=create`}
              onClick={onInsightClick}
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
