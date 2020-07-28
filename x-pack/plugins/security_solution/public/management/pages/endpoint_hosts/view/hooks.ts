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
  MANAGEMENT_STORE_HOSTS_NAMESPACE,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
} from '../../../common/constants';
import { State } from '../../../../common/store';
export function useHostSelector<TSelected>(selector: (state: HostState) => TSelected) {
  return useSelector(function (state: State) {
    return selector(
      state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][MANAGEMENT_STORE_HOSTS_NAMESPACE] as HostState
    );
  });
}

/**
 * Returns an object that contains Ingest app and URL information
 */
export const useIngestUrl = (subpath: string): { url: string; appId: string; appPath: string } => {
  const { services } = useKibana();
  return useMemo(() => {
    const appPath = `#/${subpath}`;
    return {
      url: `${services.application.getUrlForApp('ingestManager')}${appPath}`,
      appId: 'ingestManager',
      appPath,
    };
  }, [services.application, subpath]);
};

/**
 * Returns an object that contains Ingest app and URL information
 */
export const useAgentDetailsIngestUrl = (
  agentId: string
): { url: string; appId: string; appPath: string } => {
  const { services } = useKibana();
  return useMemo(() => {
    const appPath = `#/fleet/agents/${agentId}/activity`;
    return {
      url: `${services.application.getUrlForApp('ingestManager')}${appPath}`,
      appId: 'ingestManager',
      appPath,
    };
  }, [services.application, agentId]);
};
