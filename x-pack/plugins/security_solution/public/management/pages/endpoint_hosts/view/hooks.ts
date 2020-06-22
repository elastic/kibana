/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
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
export const useHostLogsUrl = (hostId: string): { url: string; appId: string; appPath: string } => {
  const { services } = useKibana();
  return useMemo(() => {
    const appPath = `/stream?logFilter=(expression:'host.id:${hostId}',kind:kuery)`;
    return {
      url: `${services.application.getUrlForApp('logs')}${appPath}`,
      appId: 'logs',
      appPath,
    };
  }, [hostId, services.application]);
};

/**
 * Returns an object that contains Ingest app and URL information
 */
export const useHostIngestUrl = (): { url: string; appId: string; appPath: string } => {
  const { services } = useKibana();
  return useMemo(() => {
    const appPath = `#/fleet`;
    return {
      url: `${services.application.getUrlForApp('ingestManager')}${appPath}`,
      appId: 'ingestManager',
      appPath,
    };
  }, [services.application]);
};
