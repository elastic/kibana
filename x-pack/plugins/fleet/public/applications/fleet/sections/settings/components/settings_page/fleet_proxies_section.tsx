/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useAuthz, useLink, useStartServices } from '../../../../hooks';
import type { FleetProxy } from '../../../../types';
import { FleetProxiesTable } from '../fleet_proxies_table';

export interface FleetProxiesSectionProps {
  proxies: FleetProxy[];
  deleteFleetProxy: (proxy: FleetProxy) => void;
}

export const FleetProxiesSection: React.FunctionComponent<FleetProxiesSectionProps> = ({
  proxies,
  deleteFleetProxy,
}) => {
  const authz = useAuthz();
  const { getHref } = useLink();
  const { docLinks } = useStartServices();

  return (
    <>
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                id="xpack.fleet.settings.fleetProxiesSection.title"
                defaultMessage="Proxies"
              />
            </h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText color="subdued" size="m">
        <FormattedMessage
          id="xpack.fleet.settings.fleetProxiesSection.subtitle"
          defaultMessage="Specify any proxy URLs to be used in Fleet servers, Outputs or Agent binary download sources. For more information see our {docLink}."
          values={{
            docLink: (
              <EuiLink target="_blank" external href={docLinks.links.fleet.proxiesSettings}>
                <FormattedMessage
                  id="xpack.fleet.settings.fleetProxiesSection.link"
                  defaultMessage="docs"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <FleetProxiesTable proxies={proxies} deleteFleetProxy={deleteFleetProxy} />
      {authz.fleet.allSettings && (
        <>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            iconType="plusInCircle"
            href={getHref('settings_create_fleet_proxy')}
            data-test-subj="addProxyBtn"
          >
            <FormattedMessage
              id="xpack.fleet.settings.fleetProxiesSection.CreateButtonLabel"
              defaultMessage="Add proxy"
            />
          </EuiButtonEmpty>
        </>
      )}
    </>
  );
};
