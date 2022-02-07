/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../../../../fleet/common';
import { pagePathGetters } from '../../../../../../../../../fleet/public';
import {
  GetExceptionSummaryResponse,
  PolicyDetailsRouteState,
} from '../../../../../../../../common/endpoint/types';
import { useAppUrl, useHttp, useToasts } from '../../../../../../../common/lib/kibana';
import { getPolicyEventFiltersPath } from '../../../../../../common/routing';
import { parsePoliciesToKQL } from '../../../../../../common/utils';
import { ExceptionItemsSummary } from './exception_items_summary';
import { LinkWithIcon } from './link_with_icon';
import { StyledEuiFlexItem } from './styled_components';
import { getSummary } from '../../../../../event_filters/service/service_actions';

export const FleetIntegrationEventFiltersCard = memo<{
  policyId: string;
}>(({ policyId }) => {
  const toasts = useToasts();
  const http = useHttp();
  const [stats, setStats] = useState<GetExceptionSummaryResponse | undefined>();
  const isMounted = useRef<boolean>();
  const { getAppUrl } = useAppUrl();

  const policyEventFiltersPath = getPolicyEventFiltersPath(policyId);

  const policyEventFiltersRouteState = useMemo<PolicyDetailsRouteState>(() => {
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

  const linkToEventFilters = useMemo(
    () => (
      <LinkWithIcon
        href={getAppUrl({
          path: policyEventFiltersPath,
        })}
        appPath={policyEventFiltersPath}
        appState={policyEventFiltersRouteState}
        data-test-subj="eventFilters-link-to-exceptions"
        size="m"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpoint.fleetCustomExtension.eventFiltersManageLabel"
          defaultMessage="Manage event filters"
        />
      </LinkWithIcon>
    ),
    [getAppUrl, policyEventFiltersPath, policyEventFiltersRouteState]
  );

  useEffect(() => {
    isMounted.current = true;
    const fetchStats = async () => {
      try {
        const summary = await getSummary({ http, filter: parsePoliciesToKQL([policyId, 'all']) });
        if (isMounted.current) {
          setStats(summary);
        }
      } catch (error) {
        if (isMounted.current) {
          toasts.addDanger(
            i18n.translate(
              'xpack.securitySolution.endpoint.fleetCustomExtension.eventFiltersSummary.error',
              {
                defaultMessage: 'There was an error trying to fetch event filters stats: "{error}"',
                values: { error },
              }
            )
          );
        }
      }
    };
    fetchStats();
    return () => {
      isMounted.current = false;
    };
  }, [http, policyId, toasts]);

  return (
    <EuiPanel
      hasShadow={false}
      paddingSize="l"
      hasBorder
      data-test-subj="eventFilters-fleet-integration-card"
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
                id="xpack.securitySolution.endpoint.eventFilters.fleetIntegration.title"
                defaultMessage="Event filters"
              />
            </h5>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ExceptionItemsSummary stats={stats} isSmall={true} />
        </EuiFlexItem>
        <StyledEuiFlexItem grow={1}>{linkToEventFilters}</StyledEuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

FleetIntegrationEventFiltersCard.displayName = 'FleetIntegrationEventFiltersCard';
