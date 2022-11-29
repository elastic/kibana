/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';

import { EuiSpacer, EuiText, EuiSuperSelect, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

// import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { sendPostHealthCheck, useGetFleetServerHosts } from '../../../hooks';
import type { FleetServerHost } from '../../../types';

const POLLING_INTERVAL_MS = 10 * 1000; // 5 sec

export const usePollingStatus = (hostName: string | undefined) => {
  const timeout = useRef<number | undefined>(undefined);
  const [status, setStatus] = useState<string>('');

  const pollFleetServerHealth = useCallback(async () => {
    const request = await sendPostHealthCheck({
      host: `${hostName}`, // 'https://localhost:8220',
    });

    setStatus(request.data?.status);
  }, [hostName]);

  useEffect(() => {
    let isAborted = false;

    const poll = () => {
      timeout.current = window.setTimeout(async () => {
        pollFleetServerHealth();
        if (!isAborted) {
          poll();
        }
      }, POLLING_INTERVAL_MS);
    };

    poll();

    if (isAborted) clearTimeout(timeout.current);

    return () => {
      isAborted = true;
    };
  }, [pollFleetServerHealth]);
  return status;
};

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

  const status = usePollingStatus(selectedFleetServerHost?.host_urls[0] || '');

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
    if (!status) return;
    const color = statusValue === 'HEALTHY' ? '#007871' : '#bd271e';

    return (
      <svg width={16} height={16} fill={color}>
        <circle cx="10" cy="10" r="4" />
      </svg>
    );
  };

  return (
    <>
      <EuiText grow={false}>
        <p>
          <FormattedMessage
            id="xpack.fleet.debug.healthCheckPanel.description"
            defaultMessage="Select the host used to enroll Fleet Server. Check the connection healthiness below."
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSuperSelect
            fullWidth
            data-test-subj="fleetDebug.fleetServerHostsSelect"
            prepend={
              <EuiText size="relative" color={''}>
                <FormattedMessage
                  id="xpack.fleet.debug.fleetServerHostsLabel"
                  defaultMessage="Fleet Server Hosts"
                />
              </EuiText>
            }
            onChange={(fleetServerHostId) =>
              setSelectedFleetServerHost(
                fleetServerHosts.find((fleetServerHost) => fleetServerHost.id === fleetServerHostId)
              )
            }
            valueOfSelected={selectedFleetServerHost?.id}
            options={fleetServerHostsOptions}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <p>
            <FormattedMessage
              id="xpack.fleet.debug.healthCheckPanel.status"
              defaultMessage="Status: "
            />
            {status}
            {circleIcon(status)}
          </p>
          {/* <p>{circleIcon(status)}</p> */}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
