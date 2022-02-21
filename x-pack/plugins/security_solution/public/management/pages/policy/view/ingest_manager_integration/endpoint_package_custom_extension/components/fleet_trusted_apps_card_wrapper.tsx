/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  PackageCustomExtensionComponentProps,
  pagePathGetters,
} from '../../../../../../../../../fleet/public';
import { getTrustedAppsListPath } from '../../../../../../common/routing';
import { ListPageRouteState } from '../../../../../../../../common/endpoint/types';
import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../../../../fleet/common';

import { useAppUrl } from '../../../../../../../common/lib/kibana/hooks';
import { LinkWithIcon } from './link_with_icon';
import { FleetTrustedAppsCard } from './fleet_trusted_apps_card';

export const FleetTrustedAppsCardWrapper = memo<PackageCustomExtensionComponentProps>(
  ({ pkgkey }) => {
    const { getAppUrl } = useAppUrl();
    const trustedAppsListUrlPath = getTrustedAppsListPath();

    const trustedAppRouteState = useMemo<ListPageRouteState>(() => {
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

    const customLink = useMemo(
      () => (
        <LinkWithIcon
          href={getAppUrl({
            path: trustedAppsListUrlPath,
          })}
          appPath={trustedAppsListUrlPath}
          appState={trustedAppRouteState}
          data-test-subj="linkToTrustedApps"
        >
          <FormattedMessage
            id="xpack.securitySolution.endpoint.fleetCustomExtension.manageTrustedAppshortLinkLabel"
            defaultMessage="Manage"
          />
        </LinkWithIcon>
      ),
      [getAppUrl, trustedAppRouteState, trustedAppsListUrlPath]
    );
    return <FleetTrustedAppsCard customLink={customLink} />;
  }
);

FleetTrustedAppsCardWrapper.displayName = 'FleetTrustedAppsCardWrapper';
