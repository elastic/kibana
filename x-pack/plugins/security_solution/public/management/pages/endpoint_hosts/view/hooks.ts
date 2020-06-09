/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { HostState } from '../types';
import {
  MANAGEMENT_STORE_ENDPOINTS_NAMESPACE,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
} from '../../../common/constants';
import { State } from '../../../../common/store';

export function useHostSelector<TSelected>(selector: (state: HostState) => TSelected) {
  return useSelector(function (state: State) {
    return selector(
      state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][MANAGEMENT_STORE_ENDPOINTS_NAMESPACE] as HostState
    );
  });
}

/**
 * Returns an object that contains Kibana Logs app and URL information for a given host id
 * @param hostId
 */
export const useHostLogsUrl = (hostId: string): { appId: string; appPath: string } => {
  return useMemo(() => {
    const appPath = `/stream?logFilter=(expression:'host.id:${hostId}',kind:kuery)`;
    return {
      appId: 'logs',
      appPath,
    };
  }, [hostId]);
};

/**
 * Returns an object that contains Ingest app and URL information
 */
export const useHostIngestUrl = (
  latestEndpointVersion: string | undefined
): { appId: string; appPath: string } => {
  return useMemo(() => {
    let appPath = `#/integrations`;
    if (latestEndpointVersion !== undefined) {
      appPath = `#/integrations/endpoint-${latestEndpointVersion}/add-datasource`;
    }
    return {
      appId: 'ingestManager',
      appPath,
    };
  }, [latestEndpointVersion]);
};
