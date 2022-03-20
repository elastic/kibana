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
import { useUserPrivileges } from '../../../../../../../common/components/user_privileges';
import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../../../../fleet/common';
import { pagePathGetters } from '../../../../../../../../../fleet/public';
import {
  GetExceptionSummaryResponse,
  PolicyDetailsRouteState,
} from '../../../../../../../../common/endpoint/types';
import { useAppUrl, useHttp, useToasts } from '../../../../../../../common/lib/kibana';
import { getPolicyHostIsolationExceptionsPath } from '../../../../../../common/routing';
import { parsePoliciesToKQL } from '../../../../../../common/utils';
import { getHostIsolationExceptionSummary } from '../../../../../host_isolation_exceptions/service';
import { ExceptionItemsSummary } from './exception_items_summary';
import { LinkWithIcon } from './link_with_icon';
import { StyledEuiFlexItem } from './styled_components';

export const FleetIntegrationHostIsolationExceptionsCard = memo<{
  policyId: string;
}>(({ policyId }) => {
  const toasts = useToasts();
  const http = useHttp();
  const [stats, setStats] = useState<GetExceptionSummaryResponse | undefined>();
  const isMounted = useRef<boolean>();
  const { getAppUrl } = useAppUrl();
  const policyHostIsolationExceptionsPath = getPolicyHostIsolationExceptionsPath(policyId);
  const privileges = useUserPrivileges().endpointPrivileges;

  const policyHostIsolationExceptionsRouteState = useMemo<PolicyDetailsRouteState>(() => {
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

  const href = useMemo(
    () => (
      <LinkWithIcon
        href={getAppUrl({
          path: policyHostIsolationExceptionsPath,
        })}
        appPath={policyHostIsolationExceptionsPath}
        appState={policyHostIsolationExceptionsRouteState}
        data-test-subj="hostIsolationExceptions-link-to-exceptions"
        size="m"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpoint.fleetCustomExtension.hostIsolationExceptionsManageLabel"
          defaultMessage="Manage host isolation exceptions"
        />
      </LinkWithIcon>
    ),
    [getAppUrl, policyHostIsolationExceptionsPath, policyHostIsolationExceptionsRouteState]
  );

  useEffect(() => {
    isMounted.current = true;
    const fetchStats = async () => {
      try {
        const summary = await getHostIsolationExceptionSummary(
          http,
          parsePoliciesToKQL([policyId, 'all'])
        );
        if (isMounted.current) {
          setStats(summary);
        }
      } catch (error) {
        if (isMounted.current) {
          toasts.addDanger(
            i18n.translate(
              'xpack.securitySolution.endpoint.fleetCustomExtension.hostIsolationExceptionsSummary.error',
              {
                defaultMessage:
                  'There was an error trying to fetch host isolation exceptions stats: "{error}"',
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

  // do not render if doesn't have privileges.
  // render if doesn't have privileges but has data to show
  if (
    (stats === undefined && !privileges.canIsolateHost) ||
    (stats?.total === 0 && !privileges.canIsolateHost)
  ) {
    return null;
  }

  return (
    <EuiPanel
      hasShadow={false}
      paddingSize="l"
      hasBorder
      data-test-subj="hostIsolationExceptions-fleet-integration-card"
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
                id="xpack.securitySolution.endpoint.hostIsolationExceptions.fleetIntegration.title"
                defaultMessage="Host isolation exceptions"
              />
            </h5>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ExceptionItemsSummary stats={stats} isSmall={true} />
        </EuiFlexItem>
        <StyledEuiFlexItem grow={1}>{href}</StyledEuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

FleetIntegrationHostIsolationExceptionsCard.displayName =
  'FleetIntegrationHostIsolationExceptionsCard';
