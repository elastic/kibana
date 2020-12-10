/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ApplicationStart } from 'kibana/public';
import styled from 'styled-components';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { LinkToApp } from '../../../../../common/components/endpoint/link_to_app';
import { MANAGEMENT_APP_ID } from '../../../../common/constants';
import { getTrustedAppsListPath } from '../../../../common/routing';
import { TrustedAppsListPageRouteState } from '../../../../../../common/endpoint/types';
import { PLUGIN_ID as FLEET_PLUGIN_ID } from '../../../../../../../fleet/common';
import {
  PackageCustomExtensionComponentProps,
  pagePathGetters,
} from '../../../../../../../fleet/public';

const LinkLabel = styled.span`
  display: inline-block;
  padding-right: ${(props) => props.theme.eui.paddingSizes.s};
`;

export const EndpointPackageCustomExtension = memo<PackageCustomExtensionComponentProps>(
  ({ pkgkey }) => {
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
            <LinkToApp
              appId={MANAGEMENT_APP_ID}
              href={getUrlForApp(MANAGEMENT_APP_ID, { path: trustedAppsListUrlPath })}
              appPath={trustedAppsListUrlPath}
              appState={trustedAppRouteState}
            >
              <LinkLabel>
                <FormattedMessage
                  id="xpack.xpack.securitySolution.endpoint.fleetCustomExtension.manageTrustedAppLinkLabel"
                  defaultMessage="Manage trusted applications"
                />
              </LinkLabel>
              <EuiIcon type="popout" />
            </LinkToApp>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

EndpointPackageCustomExtension.displayName = 'EndpointPackageCustomExtension';
