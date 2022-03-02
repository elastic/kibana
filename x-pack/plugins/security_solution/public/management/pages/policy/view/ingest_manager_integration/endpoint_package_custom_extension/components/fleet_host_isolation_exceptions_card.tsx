/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../../../../fleet/common';
import {
  PackageCustomExtensionComponentProps,
  pagePathGetters,
} from '../../../../../../../../../fleet/public';
import {
  GetExceptionSummaryResponse,
  ListPageRouteState,
} from '../../../../../../../../common/endpoint/types';
import { useKibana, useToasts } from '../../../../../../../common/lib/kibana';
import { useAppUrl } from '../../../../../../../common/lib/kibana/hooks';
import { getHostIsolationExceptionsListPath } from '../../../../../../common/routing';
import { getHostIsolationExceptionSummary } from '../../../../../host_isolation_exceptions/service';
import { ExceptionItemsSummary } from './exception_items_summary';
import { LinkWithIcon } from './link_with_icon';
import { StyledEuiFlexGridGroup, StyledEuiFlexGridItem } from './styled_components';

export const FleetHostIsolationExceptionsCard = memo<PackageCustomExtensionComponentProps>(
  ({ pkgkey }) => {
    const { getAppUrl } = useAppUrl();
    const {
      services: { http },
    } = useKibana();
    const toasts = useToasts();
    const [stats, setStats] = useState<GetExceptionSummaryResponse | undefined>();
    const hostIsolationExceptionsListUrlPath = getHostIsolationExceptionsListPath();
    const isMounted = useRef<boolean>();

    useEffect(() => {
      isMounted.current = true;
      const fetchStats = async () => {
        try {
          const summary = await getHostIsolationExceptionSummary(http);
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
    }, [http, toasts]);

    const hostIsolationExceptionsRouteState = useMemo<ListPageRouteState>(() => {
      const fleetPackageCustomUrlPath = `#${
        pagePathGetters.integration_details_custom({ pkgkey })[1]
      }`;
      return {
        backButtonLabel: i18n.translate(
          'xpack.securitySolution.endpoint.fleetCustomExtension.hostIsolationExceptionsSummary.backButtonLabel',
          { defaultMessage: 'Return to Endpoint Security integrations' }
        ),
        onBackButtonNavigateTo: [
          INTEGRATIONS_PLUGIN_ID,
          {
            path: fleetPackageCustomUrlPath,
          },
        ],
        backButtonUrl: getAppUrl({
          appId: INTEGRATIONS_PLUGIN_ID,
          path: fleetPackageCustomUrlPath,
        }),
      };
    }, [getAppUrl, pkgkey]);

    return (
      <EuiPanel hasShadow={false} paddingSize="l" hasBorder data-test-subj="fleedEventFiltersCard">
        <StyledEuiFlexGridGroup alignItems="baseline" justifyContent="center">
          <StyledEuiFlexGridItem gridarea="title" alignitems="flex-start">
            <EuiText>
              <h4>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.fleetCustomExtension.hostIsolationExceptionsSummary.label"
                  defaultMessage="Host isolation exceptions"
                />
              </h4>
            </EuiText>
          </StyledEuiFlexGridItem>
          <StyledEuiFlexGridItem gridarea="summary">
            <ExceptionItemsSummary stats={stats} />
          </StyledEuiFlexGridItem>
          <StyledEuiFlexGridItem gridarea="link" alignitems="flex-end">
            <>
              <LinkWithIcon
                href={getAppUrl({
                  path: hostIsolationExceptionsListUrlPath,
                })}
                appPath={hostIsolationExceptionsListUrlPath}
                appState={hostIsolationExceptionsRouteState}
                data-test-subj="linkToHostIsolationExceptions"
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.fleetCustomExtension.hostIsolationExceptionsSummary.manageLabel"
                  defaultMessage="Manage"
                />
              </LinkWithIcon>
            </>
          </StyledEuiFlexGridItem>
        </StyledEuiFlexGridGroup>
      </EuiPanel>
    );
  }
);

FleetHostIsolationExceptionsCard.displayName = 'FleetHostIsolationExceptionsCard';
