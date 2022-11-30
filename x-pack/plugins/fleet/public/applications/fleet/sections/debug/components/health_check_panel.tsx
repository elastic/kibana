/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';

import {
  EuiSpacer,
  EuiText,
  EuiSuperSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

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

  const timeout = useRef<number | undefined>(undefined);
  const hostName = useMemo(
    () => selectedFleetServerHost?.host_urls[0] || '',
    [selectedFleetServerHost?.host_urls]
  );

  const [healthData, setHealthData] = useState<any>();

  const pollFleetServerHealth = useCallback(async () => {
    const res = await sendPostHealthCheck({
      host: `${hostName}`,
    });
    setHealthData(res);
  }, [hostName]);

  useEffect(() => {
    let isAborted = false;

    const poll = () => {
      timeout.current = window.setTimeout(async () => {
        pollFleetServerHealth();
        if (!isAborted && hostName) {
          poll();
        }
      }, POLLING_INTERVAL_MS);
    };

    poll();

    if (isAborted || !hostName) clearTimeout(timeout.current);

    return () => {
      isAborted = true;
    };
  }, [hostName, pollFleetServerHealth]);

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

  const circleIcon = (statusValue: string) => {
    if (!statusValue) return null;

    let color;
    switch (statusValue) {
      case 'HEALTHY':
        color = '#007871'; // green
        break;
      case 'UNHEALTHY':
        color = '#ffd200'; // yellow
        break;
      case 'OFFLINE':
        color = '#bd271e'; // red
        break;
      default:
        color = '';
    }

    return (
      <svg width={16} height={16} fill={color}>
        <circle cx="10" cy="10" r="6" />
      </svg>
    );
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
        <EuiFlexItem>
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
        <EuiFlexItem>
          {healthData?.data?.status && hostName === healthData?.data?.host ? (
            <p>
              <FormattedMessage
                id="xpack.fleet.debug.healthCheckPanel.status"
                defaultMessage="Status: "
              />
              {healthData?.data?.status}
              {circleIcon(healthData?.data?.status)}
            </p>
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
                defaultMessage="errorMessage"
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
