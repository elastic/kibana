/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  PackageCustomExtensionComponentProps,
  pagePathGetters,
} from '../../../../../../../../../fleet/public';
import { getEventFiltersListPath } from '../../../../../../common/routing';
import {
  GetExceptionSummaryResponse,
  ListPageRouteState,
} from '../../../../../../../../common/endpoint/types';
import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../../../../fleet/common';
import { useKibana, useToasts } from '../../../../../../../common/lib/kibana';
import { useAppUrl } from '../../../../../../../common/lib/kibana/hooks';
import { LinkWithIcon } from './link_with_icon';
import { ExceptionItemsSummary } from './exception_items_summary';
import { EventFiltersHttpService } from '../../../../../event_filters/service';
import { StyledEuiFlexGridGroup, StyledEuiFlexGridItem } from './styled_components';

export const FleetEventFiltersCard = memo<PackageCustomExtensionComponentProps>(({ pkgkey }) => {
  const { getAppUrl } = useAppUrl();
  const {
    services: { http },
  } = useKibana();
  const toasts = useToasts();
  const [stats, setStats] = useState<GetExceptionSummaryResponse | undefined>();
  const eventFiltersListUrlPath = getEventFiltersListPath();
  const eventFiltersApi = useMemo(() => new EventFiltersHttpService(http), [http]);
  const isMounted = useRef<boolean>();

  useEffect(() => {
    isMounted.current = true;
    const fetchStats = async () => {
      try {
        const summary = await eventFiltersApi.getSummary();
        if (isMounted.current) {
          setStats(summary);
        }
      } catch (error) {
        if (isMounted.current) {
          toasts.addDanger(
            i18n.translate(
              'xpack.securitySolution.endpoint.fleetCustomExtension.eventFiltersSummaryError',
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
  }, [eventFiltersApi, toasts]);

  const eventFiltersRouteState = useMemo<ListPageRouteState>(() => {
    const fleetPackageCustomUrlPath = `#${
      pagePathGetters.integration_details_custom({ pkgkey })[1]
    }`;
    return {
      backButtonLabel: i18n.translate(
        'xpack.securitySolution.endpoint.fleetCustomExtension.backButtonLabel',
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
                id="xpack.securitySolution.endpoint.fleetCustomExtension.eventFiltersLabel"
                defaultMessage="Event filters"
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
                path: eventFiltersListUrlPath,
              })}
              appPath={eventFiltersListUrlPath}
              appState={eventFiltersRouteState}
              data-test-subj="linkToEventFilters"
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.fleetCustomExtension.manageEventFiltersLinkLabel"
                defaultMessage="Manage"
              />
            </LinkWithIcon>
          </>
        </StyledEuiFlexGridItem>
      </StyledEuiFlexGridGroup>
    </EuiPanel>
  );
});

FleetEventFiltersCard.displayName = 'FleetEventFiltersCard';
