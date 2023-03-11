/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiIcon, EuiSpacer, EuiSuperSelect } from '@elastic/eui';

import { EuiText } from '@elastic/eui';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTheme } from 'styled-components';

import type { FleetServerHost } from '../../../types';

interface FleetServerHostSelectProps {
  selectedFleetServerHost?: FleetServerHost;
  fleetServerHosts: FleetServerHost[];
  setFleetServerHost: (host: FleetServerHost | null | undefined) => void;
}

export const FleetServerHostSelect: React.FunctionComponent<FleetServerHostSelectProps> = ({
  selectedFleetServerHost,
  setFleetServerHost,
  fleetServerHosts,
}) => {
  const theme = useTheme() as EuiTheme;

  const fleetServerHostsOptions = useMemo(
    () => [
      ...fleetServerHosts.map((fleetServerHost) => {
        return {
          inputDisplay: `${fleetServerHost.name} (${fleetServerHost.host_urls[0]})`,
          value: fleetServerHost.id,
        };
      }),
      {
        icon: <EuiIcon type="plus" size="m" color="primary" />,
        inputDisplay: (
          <FormattedMessage
            id="xpack.fleet.fleetServerSetup.addFleetServerHostBtn"
            defaultMessage="Add new Fleet Server Hosts"
          />
        ),
        dropdownDisplay: (
          <EuiText size="relative" color={theme.eui.euiColorPrimary}>
            <FormattedMessage
              id="xpack.fleet.fleetServerSetup.addFleetServerHostBtn"
              defaultMessage="Add new Fleet Server Hosts"
            />
          </EuiText>
        ),
        'data-test-subj': 'fleetServerSetup.addNewHostBtn',
        value: '@@##ADD_FLEET_SERVER_HOST##@@',
      },
    ],
    [fleetServerHosts, theme.eui.euiColorPrimary]
  );

  return (
    <>
      <EuiSuperSelect
        fullWidth
        data-test-subj="fleetServerSetup.fleetServerHostsSelect"
        prepend={
          <EuiText size="relative" color={''}>
            <FormattedMessage
              id="xpack.fleet.fleetServerSetup.fleetServerHostsLabel"
              defaultMessage="Fleet Server Hosts"
            />
          </EuiText>
        }
        onChange={(fleetServerHostId) =>
          setFleetServerHost(
            fleetServerHosts.find((fleetServerHost) => fleetServerHost.id === fleetServerHostId)
          )
        }
        valueOfSelected={selectedFleetServerHost?.id}
        options={fleetServerHostsOptions}
      />
      <EuiSpacer size="m" />
    </>
  );
};
