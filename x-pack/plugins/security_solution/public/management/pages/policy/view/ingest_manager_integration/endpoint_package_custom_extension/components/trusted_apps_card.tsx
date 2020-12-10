/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo, useState } from 'react';
import { ApplicationStart } from 'kibana/public';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
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

export const FleetTrustedAppsCard = memo<PackageCustomExtensionComponentProps>(({ pkgkey }) => {
  const {
    services: {
      application: { getUrlForApp },
    },
  } = useKibana<{ application: ApplicationStart }>();
  const [total] = useState<number>(0);

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
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText>
            <h4>
              <FormattedMessage
                id="xpack.xpack.securitySolution.endpoint.fleetCustomExtension.trustedAppLabel"
                defaultMessage="Trusted Applications"
              />
            </h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.xpack.securitySolution.endpoint.fleetCustomExtension.totalLabel"
              defaultMessage="Total"
            />
            <EuiBadge color="primary">{total}</EuiBadge>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <LinkWithIcon
            appId={MANAGEMENT_APP_ID}
            href={getUrlForApp(MANAGEMENT_APP_ID, { path: trustedAppsListUrlPath })}
            appPath={trustedAppsListUrlPath}
            appState={trustedAppRouteState}
          >
            <FormattedMessage
              id="xpack.xpack.securitySolution.endpoint.fleetCustomExtension.manageTrustedAppLinkLabel"
              defaultMessage="Manage trusted applications"
            />
          </LinkWithIcon>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

FleetTrustedAppsCard.displayName = 'FleetTrustedAppsCard';
