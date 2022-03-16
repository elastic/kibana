/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useUrlParams } from '../../../components/hooks/use_url_params';
import { EndpointConsole } from '../../../components/endpoint_console';

// ------------------------------------------------------------
// FOR DEV PURPOSES ONLY
// FIXME:PT Delete once we have support via row actions menu
export const DevConsole = memo(() => {
  const isConsoleEnabled = useIsExperimentalFeatureEnabled('responseActionsConsoleEnabled');
  const {
    urlParams: { showConsole = false },
  } = useUrlParams();
  const endpoint = useMemo(() => {
    return {
      '@timestamp': 1647442828174,
      event: {
        created: 1647442828174,
        id: 'ddf6570b-9175-4a6d-b288-61a09771c647',
        kind: 'metric',
        category: ['host'],
        type: ['info'],
        module: 'endpoint',
        action: 'endpoint_metadata',
        dataset: 'endpoint.metadata',
      },
      agent: {
        version: '7.0.13',
        id: '0dc3661d-6e67-46b0-af39-6f12b025fcb0',
        type: 'endpoint',
      },
      elastic: { agent: { id: '6db499e5-4927-4350-abb8-d8318e7d0eec' } },
      host: {
        id: '82ef2781-44d8-4915-869c-3c484c86b57d',
        hostname: 'Host-ku5jy6j0pw',
        name: 'Host-ku5jy6j0pw',
        architecture: '1u6tiyo7sc',
        ip: ['10.209.45.18', '10.2.118.145', '10.195.166.215'],
        mac: ['d7-82-82-bc-e4-13'],
        os: {
          name: 'Windows',
          full: 'Windows Server 2016',
          version: '10.0',
          platform: 'Windows',
          family: 'windows',
          Ext: [Object],
        },
      },
      Endpoint: {
        status: 'enrolled',
        policy: { applied: [Object] },
        configuration: { isolation: false },
        state: { isolation: false },
        capabilities: [],
      },
      data_stream: {
        type: 'metrics',
        dataset: 'endpoint.metadata',
        namespace: 'default',
      },
    };
  }, []);

  return isConsoleEnabled && showConsole ? (
    <div style={{ height: 'calc(100vh - 300px)' }}>
      <EndpointConsole endpoint={endpoint} />
    </div>
  ) : null;
});
DevConsole.displayName = 'DevConsole';
