/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, useMemo } from 'react';

import {
  EuiSpacer,
  EuiText,
  EuiSuperSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiHealth,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@tanstack/react-query';

import { sendPostHealthCheck, useGetFleetServerHosts } from '../../../hooks';
import type { FleetServerHost } from '../../../types';

const POLLING_INTERVAL_S = 10; // 10 sec
const POLLING_INTERVAL_MS = POLLING_INTERVAL_S * 1000;

export const HealthCheckPanel: React.FunctionComponent = () => {
  const [selectedFleetServerHost, setSelectedFleetServerHost] = useState<
    FleetServerHost | undefined
  >();

  const { data } = useGetFleetServerHosts();
  const fleetServerHosts = useMemo(() => data?.items ?? [], [data?.items]);

  useEffect(() => {
    const defaultHost = fleetServerHosts.find((item) => item.is_default === true);
    if (defaultHost) {
      setSelectedFleetServerHost(defaultHost);
    }
  }, [fleetServerHosts]);

  const hostName = useMemo(
    () => selectedFleetServerHost?.host_urls[0] || '',
    [selectedFleetServerHost?.host_urls]
  );

  const [healthData, setHealthData] = useState<any>();

  const { data: healthCheckResponse } = useQuery(
    ['fleetServerHealth', hostName],
    () => sendPostHealthCheck({ host: hostName }),
    { refetchInterval: POLLING_INTERVAL_MS }
  );
  useEffect(() => {
    setHealthData(healthCheckResponse);
  }, [healthCheckResponse]);

  const fleetServerHostsOptions = useMemo(
    () => [
      ...fleetServerHosts.map((fleetServerHost) => {
        return {
          inputDisplay: `${fleetServerHost.name} (${fleetServerHost.host_urls[0]})`,
          value: fleetServerHost.id,
        };
      }),
    ],
    [fleetServerHosts]
  );

  const healthStatus = (statusValue: string) => {
    if (!statusValue) return null;

    let color;
    switch (statusValue) {
      case 'HEALTHY':
        color = 'success';
        break;
      case 'UNHEALTHY':
        color = 'warning';
        break;
      case 'OFFLINE':
        color = 'subdued';
        break;
      default:
        color = 'subdued';
    }

    return <EuiHealth color={color}>{statusValue}</EuiHealth>;
  };

  return (
    <>
      <EuiText grow={false}>
        <p>
          <FormattedMessage
            id="xpack.fleet.debug.healthCheckPanel.description"
            defaultMessage="Select the host used to enroll Fleet Server. The connection is refreshed every {interval}s."
            values={{
              interval: POLLING_INTERVAL_S,
            }}
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem
          grow={false}
          css={`
            min-width: 600px;
          `}
        >
          <EuiSuperSelect
            fullWidth
            data-test-subj="fleetDebug.fleetServerHostsSelect"
            prepend={
              <EuiText size="relative" color={''}>
                <FormattedMessage
                  id="xpack.fleet.debug.healthCheckPanel.fleetServerHostsLabel"
                  defaultMessage="Fleet Server Hosts"
                />
              </EuiText>
            }
            onChange={(fleetServerHostId) => {
              setHealthData(undefined);
              setSelectedFleetServerHost(
                fleetServerHosts.find((fleetServerHost) => fleetServerHost.id === fleetServerHostId)
              );
            }}
            valueOfSelected={selectedFleetServerHost?.id}
            options={fleetServerHostsOptions}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {healthData?.data?.status && hostName === healthData?.data?.host ? (
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <FormattedMessage
                  id="xpack.fleet.debug.healthCheckPanel.status"
                  defaultMessage="Status:"
                />
              </EuiFlexItem>
              <EuiFlexItem>{healthStatus(healthData?.data?.status)}</EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
      {healthData?.error && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut title="Error" color="danger">
            {healthData?.error?.message ?? (
              <FormattedMessage
                id="xpack.fleet.debug.healthCheckPanel.fetchError"
                defaultMessage="Message: {errorMessage}"
                values={{
                  errorMessage: healthData?.error?.message,
                }}
              />
            )}
          </EuiCallOut>
        </>
      )}
    </>
  );
};
