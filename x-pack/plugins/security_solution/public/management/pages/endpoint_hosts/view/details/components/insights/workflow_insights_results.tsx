/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
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
  results?: SecurityWorkflowInsight[];
  scanCompleted: boolean;
  endpointId: string;
  endpointOs?: string;
}
import type { EndpointInsightRouteState } from '../../../../types';
import { getEndpointDetailsPath } from '../../../../../../common/routing';
import { useKibana } from '../../../../../../../common/lib/kibana';
import { APP_PATH, TRUSTED_APPS_PATH } from '../../../../../../../../common/constants';
import type { SecurityWorkflowInsight } from '../../../../../../../../common/endpoint/types/workflow_insights';

const CustomEuiCallOut = styled(EuiCallOut)`
  & .euiButtonIcon {
    margin-top: 5px; /* Lower the close button */
  }
`;

export const WorkflowInsightsResults = ({
  results,
  scanCompleted,
  endpointId,
  endpointOs,
}: WorkflowInsightsResultsProps) => {
  const [showEmptyResultsCallout, setShowEmptyResultsCallout] = useState(false);
  const hideEmptyStateCallout = () => setShowEmptyResultsCallout(false);

  const {
    application: { navigateToUrl },
  } = useKibana().services;

  useEffect(() => {
    setShowEmptyResultsCallout(results?.length === 0 && scanCompleted);
  }, [results, scanCompleted]);

  const openArtifactCreationPage = ({
    remediation,
  }: Pick<SecurityWorkflowInsight, 'remediation'>) => {
    const url = `${APP_PATH}${TRUSTED_APPS_PATH}?show=create`;

    // TODO: handle multiple exception list items
    const state: EndpointInsightRouteState | {} = {
      ...(remediation.exception_list_items && remediation.exception_list_items.length
        ? {
            insight: {
              back_url: `${APP_PATH}${getEndpointDetailsPath({
                name: 'endpointDetails',
                selected_endpoint: endpointId,
              })}`,
              item: {
                comments: [],
                description: remediation.exception_list_items[0].description,
                entries: remediation.exception_list_items[0].entries,
                list_id: remediation.exception_list_items[0].list_id,
                name: remediation.exception_list_items[0].name,
                namespace_type: 'agnostic',
                tags: remediation.exception_list_items[0].tags,
                type: 'simple',
                os_types: [endpointOs], // TODO: is this needed?
              },
            },
          }
        : {}),
    };

    navigateToUrl(url, {
      state,
    });
  };

  const onInsightClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    { remediation }: Pick<SecurityWorkflowInsight, 'remediation'>
  ) => {
    e.preventDefault();
    openArtifactCreationPage({ remediation });
  };

  const renderContent = () => {
    if (showEmptyResultsCallout) {
      return (
        <CustomEuiCallOut onDismiss={hideEmptyStateCallout} color={'success'}>
          {WORKFLOW_INSIGHTS.issues.emptyResults}
        </CustomEuiCallOut>
      );
    } else if (results?.length) {
      return results.map((insight, index) => {
        return (
          <EuiPanel paddingSize="m" hasShadow={false} hasBorder key={index}>
            <EuiFlexGroup alignItems={'center'} gutterSize={'m'}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="warning" size="l" color="warning" />
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiText size="s">
                  <EuiText size={'s'}>
                    <strong>{insight.value}</strong>
                  </EuiText>
                  <EuiText size={'s'} color={'subdued'}>
                    {insight.message}
                  </EuiText>
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
                <EuiButtonIcon
                  aria-label="Navigate to create trusted app" // TODO: localize
                  iconType="popout"
                  href={`${APP_PATH}${TRUSTED_APPS_PATH}?show=create`}
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) =>
                    onInsightClick(e, { remediation: insight.remediation })
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        );
      });
    }
    return null;
  };

  return (
    <>
      {showEmptyResultsCallout || results?.length ? (
        <>
          <EuiText size={'s'}>
            <h4>{WORKFLOW_INSIGHTS.issues.title}</h4>
          </EuiText>
          <EuiSpacer size={'s'} />
        </>
      ) : null}
      {renderContent()}
    </>
  );
};
