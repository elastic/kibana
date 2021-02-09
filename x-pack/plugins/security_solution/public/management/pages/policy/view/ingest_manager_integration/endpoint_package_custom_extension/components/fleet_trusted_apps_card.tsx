/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { ApplicationStart } from 'kibana/public';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  PackageCustomExtensionComponentProps,
  pagePathGetters,
} from '../../../../../../../../../fleet/public';
import { useKibana } from '../../../../../../../../../../../src/plugins/kibana_react/public';
import { getTrustedAppsListPath } from '../../../../../../common/routing';
import { TrustedAppsListPageRouteState } from '../../../../../../../../common/endpoint/types';
import { PLUGIN_ID as FLEET_PLUGIN_ID } from '../../../../../../../../../fleet/common';
import { MANAGEMENT_APP_ID } from '../../../../../../common/constants';
import { LinkWithIcon } from './link_with_icon';
import { TrustedAppItemsSummary } from './trusted_app_items_summary';

export const FleetTrustedAppsCard = memo<PackageCustomExtensionComponentProps>(({ pkgkey }) => {
  const {
    services: {
      application: { getUrlForApp },
    },
  } = useKibana<{ application: ApplicationStart }>();

  const trustedAppsListUrlPath = getTrustedAppsListPath();

  const trustedAppRouteState = useMemo<TrustedAppsListPageRouteState>(() => {
    const fleetPackageCustomUrlPath = `#${pagePathGetters.integration_details({
      pkgkey,
      panel: 'custom',
    })}`;
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
        <EuiFlexItem>
          <EuiText>
            <h4>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.fleetCustomExtension.trustedAppsLabel"
                defaultMessage="Trusted Applications"
              />
            </h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TrustedAppItemsSummary />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>
            <LinkWithIcon
              appId={MANAGEMENT_APP_ID}
              href={getUrlForApp(MANAGEMENT_APP_ID, { path: trustedAppsListUrlPath })}
              appPath={trustedAppsListUrlPath}
              appState={trustedAppRouteState}
              data-test-subj="linkToTrustedApps"
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.fleetCustomExtension.manageTrustedAppLinkLabel"
                defaultMessage="Manage trusted applications"
              />
            </LinkWithIcon>
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

FleetTrustedAppsCard.displayName = 'FleetTrustedAppsCard';
