/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { EndpointState } from '../../types';
import { State } from '../../../../../common/store';
import {
  MANAGEMENT_STORE_ENDPOINTS_NAMESPACE,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
} from '../../../../common/constants';
import { useAppUrl } from '../../../../../common/lib/kibana';

export function useEndpointSelector<TSelected>(selector: (state: EndpointState) => TSelected) {
  return useSelector(function (state: State) {
    return selector(
      state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][
        MANAGEMENT_STORE_ENDPOINTS_NAMESPACE
      ] as EndpointState
    );
  });
}

/**
 * Returns an object that contains Fleet app and URL information
 */
export const useIngestUrl = (subpath: string): { url: string; appId: string; appPath: string } => {
  const { getAppUrl } = useAppUrl();
  return useMemo(() => {
    const appPath = `#/${subpath}`;
    return {
      url: `${getAppUrl({ appId: 'fleet' })}${appPath}`,
      appId: 'fleet',
      appPath,
    };
  }, [getAppUrl, subpath]);
};
/**
 * Returns an object that contains Fleet app and URL information
 */
export const useAgentDetailsIngestUrl = (
  agentId: string
): { url: string; appId: string; appPath: string } => {
  const { getAppUrl } = useAppUrl();
  return useMemo(() => {
    const appPath = pagePathGetters.agent_details_logs({ agentId })[1];

    return {
      url: `${getAppUrl({ appId: 'fleet' })}${appPath}`,
      appId: 'fleet',
      appPath,
    };
  }, [getAppUrl, agentId]);
};
