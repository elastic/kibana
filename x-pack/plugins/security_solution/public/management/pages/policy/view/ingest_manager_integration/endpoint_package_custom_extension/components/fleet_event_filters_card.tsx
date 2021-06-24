/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { ApplicationStart, CoreStart } from 'kibana/public';
import { EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  PackageCustomExtensionComponentProps,
  pagePathGetters,
} from '../../../../../../../../../fleet/public';
import { useKibana } from '../../../../../../../../../../../src/plugins/kibana_react/public';
import { getEventFiltersListPath } from '../../../../../../common/routing';
import {
  GetExceptionSummaryResponse,
  ListPageRouteState,
} from '../../../../../../../../common/endpoint/types';
import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../../../../fleet/common';
import { MANAGEMENT_APP_ID } from '../../../../../../common/constants';
import { useToasts } from '../../../../../../../common/lib/kibana';
import { LinkWithIcon } from './link_with_icon';
import { ExceptionItemsSummary } from './exception_items_summary';
import { EventFiltersHttpService } from '../../../../../event_filters/service';
import { StyledEuiFlexGridGroup, StyledEuiFlexGridItem } from './styled_components';

export const FleetEventFiltersCard = memo<PackageCustomExtensionComponentProps>(({ pkgkey }) => {
  const {
    services: {
      application: { getUrlForApp },
      http,
    },
  } = useKibana<CoreStart & { application: ApplicationStart }>();
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
        { defaultMessage: 'Back to Endpoint Integration' }
      ),
      onBackButtonNavigateTo: [
        INTEGRATIONS_PLUGIN_ID,
        {
          path: fleetPackageCustomUrlPath,
        },
      ],
      backButtonUrl: getUrlForApp(INTEGRATIONS_PLUGIN_ID, {
        path: fleetPackageCustomUrlPath,
      }),
    };
  }, [getUrlForApp, pkgkey]);

  return (
    <EuiPanel paddingSize="l">
      <StyledEuiFlexGridGroup alignItems="baseline" justifyContent="center">
        <StyledEuiFlexGridItem gridarea="title" alignitems="flex-start">
          <EuiText>
            <h4>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.fleetCustomExtension.eventFiltersLabel"
                defaultMessage="Event Filters"
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
              appId={MANAGEMENT_APP_ID}
              href={getUrlForApp(MANAGEMENT_APP_ID, { path: eventFiltersListUrlPath })}
              appPath={eventFiltersListUrlPath}
              appState={eventFiltersRouteState}
              data-test-subj="linkToEventFilters"
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.fleetCustomExtension.manageEventFiltersLinkLabel"
                defaultMessage="Manage event filters"
              />
            </LinkWithIcon>
          </>
        </StyledEuiFlexGridItem>
      </StyledEuiFlexGridGroup>
    </EuiPanel>
  );
});

FleetEventFiltersCard.displayName = 'FleetEventFiltersCard';
