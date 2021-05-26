/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState, useEffect } from 'react';
import { ApplicationStart, CoreStart } from 'kibana/public';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  PackageCustomExtensionComponentProps,
  pagePathGetters,
} from '../../../../../../../../../fleet/public';
import { useKibana } from '../../../../../../../../../../../src/plugins/kibana_react/public';
import { getEventFiltersListPath } from '../../../../../../common/routing';
import { GetExceptionSummaryResponse } from '../../../../../../../../common/endpoint/types';
import { PLUGIN_ID as FLEET_PLUGIN_ID } from '../../../../../../../../../fleet/common';
import { MANAGEMENT_APP_ID } from '../../../../../../common/constants';
import { LinkWithIcon } from './link_with_icon';
import { ExceptionItemsSummary } from './exception_items_summary';

export const FleetEventFiltersCard = memo<PackageCustomExtensionComponentProps>(({ pkgkey }) => {
  const {
    services: {
      application: { getUrlForApp },
      http,
    },
  } = useKibana<CoreStart & { application: ApplicationStart }>();

  const [stats, setStats] = useState<GetExceptionSummaryResponse | undefined>();
  const eventFiltersListUrlPath = getEventFiltersListPath();

  useEffect(() => {
    const fetchStats = async () => {
      const summary = await http.get('/api/exception_lists/_summary', {
        query: {
          list_id: 'endpoint_event_filters',
          namespace_type: 'agnostic',
        },
      });
      setStats(summary);
    };
    fetchStats();
  }, [http]);

  const eventFiltersRouteState = useMemo(() => {
    const fleetPackageCustomUrlPath = `#${pagePathGetters.integration_details_custom({ pkgkey })}`;
    return {
      backButtonLabel: i18n.translate(
        'xpack.securitySolution.endpoint.fleetCustomExtension.backButtonLabel',
        { defaultMessage: 'Back to Endpoint Integration' }
      ),
      onBackButtonNavigateTo: [
        FLEET_PLUGIN_ID,
        {
          path: fleetPackageCustomUrlPath,
        },
      ],
      backButtonUrl: getUrlForApp(FLEET_PLUGIN_ID, {
        path: fleetPackageCustomUrlPath,
      }),
    };
  }, [getUrlForApp, pkgkey]);

  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup alignItems="baseline">
        <EuiFlexItem grow={false}>
          <EuiText>
            <h4>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.fleetCustomExtension.eventFiltersLabel"
                defaultMessage="Event Filters"
              />
            </h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem style={{ alignItems: 'center', justifyContent: 'center' }}>
          <ExceptionItemsSummary stats={stats} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>
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
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

FleetEventFiltersCard.displayName = 'FleetEventFiltersCard';
