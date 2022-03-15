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
import { useAppUrl, useHttp, useToasts } from '../../../../../../../common/lib/kibana';
import { getPolicyBlocklistsPath } from '../../../../../../common/routing';
import { ExceptionItemsSummary } from './exception_items_summary';
import { LinkWithIcon } from './link_with_icon';
import { StyledEuiFlexItem } from './styled_components';
import { BlocklistsApiClient } from '../../../../../blocklist/services';
import { useSummaryArtifact } from '../../../../../../hooks/artifacts';
import { SEARCHABLE_FIELDS } from '../../../../../blocklist/constants';

export const FleetIntegrationBlocklistsCard = memo<{
  policyId: string;
}>(({ policyId }) => {
  const toasts = useToasts();
  const http = useHttp();
  const { getAppUrl } = useAppUrl();
  const blocklistsApiClientInstance = BlocklistsApiClient.getInstance(http);

  const policyBlocklistsPath = getPolicyBlocklistsPath(policyId);

  const { data } = useSummaryArtifact(
    blocklistsApiClientInstance,
    { policies: [policyId, 'all'] },
    SEARCHABLE_FIELDS,
    {
      onError: (error) =>
        toasts.addDanger(
          i18n.translate(
            'xpack.securitySolution.endpoint.fleetCustomExtension.blocklistsSummary.error',
            {
              defaultMessage: 'There was an error trying to fetch blocklists stats: "{error}"',
              values: { error: error.message },
            }
          )
        ),
    }
  );

  const policyBlocklistsRouteState = useMemo<PolicyDetailsRouteState>(() => {
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

  const linkToBlocklists = useMemo(
    () => (
      <LinkWithIcon
        href={getAppUrl({
          path: policyBlocklistsPath,
        })}
        appPath={policyBlocklistsPath}
        appState={policyBlocklistsRouteState}
        data-test-subj="blocklists-link-to-exceptions"
        size="m"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpoint.fleetCustomExtension.blocklistsManageLabel"
          defaultMessage="Manage blocklists"
        />
      </LinkWithIcon>
    ),
    [getAppUrl, policyBlocklistsPath, policyBlocklistsRouteState]
  );

  return (
    <EuiPanel
      hasShadow={false}
      paddingSize="l"
      hasBorder
      data-test-subj="blocklists-fleet-integration-card"
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
            <h5>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.blocklists.fleetIntegration.title"
                defaultMessage="Blocklists"
              />
            </h5>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ExceptionItemsSummary stats={data} isSmall={true} />
        </EuiFlexItem>
        <StyledEuiFlexItem grow={1}>{linkToBlocklists}</StyledEuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

FleetIntegrationBlocklistsCard.displayName = 'FleetIntegrationBlocklistsCard';
