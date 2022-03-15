/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo, useMemo } from 'react';
import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../../../../fleet/common';
import { pagePathGetters } from '../../../../../../../../../fleet/public';
import { PolicyDetailsRouteState } from '../../../../../../../../common/endpoint/types';
import { useAppUrl, useToasts } from '../../../../../../../common/lib/kibana';
import { ExceptionItemsSummary } from './exception_items_summary';
import { LinkWithIcon } from './link_with_icon';
import { StyledEuiFlexItem } from './styled_components';
import { useSummaryArtifact } from '../../../../../../hooks/artifacts';
import { ExceptionsListApiClient } from '../../../../../../services/exceptions_list/exceptions_list_api_client';

const ARTIFACTS_LABELS = {
  artifactsSummaryApiError: (error: string) =>
    i18n.translate('xpack.securitySolution.endpoint.fleetCustomExtension.artifactsSummary.error', {
      defaultMessage: 'There was an error trying to fetch artifacts stats: "{error}"',
      values: { error },
    }),
  cardTitle: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.fleetCustomExtension.artifactsManageLabel"
      defaultMessage="Artifacts"
    />
  ),
  linkLabel: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.fleetCustomExtension.artifactsManageLabel"
      defaultMessage="Manage artifacts"
    />
  ),
};

export type ARTIFACTS_LABELS_TYPE = typeof ARTIFACTS_LABELS;

export const FleetIntegrationArtifactsCard = memo<{
  policyId: string;
  artifactApiClientInstance: ExceptionsListApiClient;
  getArtifactsPath: (policyId: string) => string;
  searchableFields: readonly string[];
  labels?: ARTIFACTS_LABELS_TYPE;
}>(
  ({
    policyId,
    artifactApiClientInstance,
    getArtifactsPath,
    searchableFields,
    labels = ARTIFACTS_LABELS,
  }) => {
    const toasts = useToasts();
    const { getAppUrl } = useAppUrl();
    const policyArtifactsPath = getArtifactsPath(policyId);

    const { data } = useSummaryArtifact(
      artifactApiClientInstance,
      { policies: [policyId, 'all'] },
      searchableFields,
      {
        onError: (error) => toasts.addDanger(labels.artifactsSummaryApiError(error.message)),
      }
    );

    const policyArtifactsRouteState = useMemo<PolicyDetailsRouteState>(() => {
      const fleetPackageIntegrationCustomUrlPath = `#${
        pagePathGetters.integration_policy_edit({ packagePolicyId: policyId })[1]
      }`;

      return {
        backLink: {
          label: i18n.translate(
            'xpack.securitySolution.endpoint.fleetCustomExtension.artifacts.backButtonLabel',
            {
              defaultMessage: `Back to Fleet integration policy`,
            }
          ),
          navigateTo: [
            INTEGRATIONS_PLUGIN_ID,
            {
              path: fleetPackageIntegrationCustomUrlPath,
            },
          ],
          href: getAppUrl({
            appId: INTEGRATIONS_PLUGIN_ID,
            path: fleetPackageIntegrationCustomUrlPath,
          }),
        },
      };
    }, [getAppUrl, policyId]);

    const linkToArtifacts = useMemo(
      () => (
        <LinkWithIcon
          href={getAppUrl({
            path: policyArtifactsPath,
          })}
          appPath={policyArtifactsPath}
          appState={policyArtifactsRouteState}
          data-test-subj="artifacts-link-to-exceptions"
          size="m"
        >
          {labels.linkLabel}
        </LinkWithIcon>
      ),
      [getAppUrl, labels.linkLabel, policyArtifactsPath, policyArtifactsRouteState]
    );

    return (
      <EuiPanel
        hasShadow={false}
        paddingSize="l"
        hasBorder
        data-test-subj="artifacts-fleet-integration-card"
      >
        <EuiFlexGroup
          alignItems="baseline"
          justifyContent="flexStart"
          gutterSize="s"
          direction="row"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiText>
              <h5>{labels.cardTitle}</h5>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ExceptionItemsSummary stats={data} isSmall={true} />
          </EuiFlexItem>
          <StyledEuiFlexItem grow={1}>{linkToArtifacts}</StyledEuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

FleetIntegrationArtifactsCard.displayName = 'FleetIntegrationArtifactsCard';
