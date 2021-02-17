/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import { EndpointState } from '../types';
import {
  MANAGEMENT_STORE_ENDPOINTS_NAMESPACE,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
} from '../../../common/constants';
import { State } from '../../../../common/store';
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
  const { services } = useKibana();
  return useMemo(() => {
    const appPath = `#/${subpath}`;
    return {
      url: `${services.application.getUrlForApp('fleet')}${appPath}`,
      appId: 'fleet',
      appPath,
    };
  }, [services.application, subpath]);
};

/**
 * Returns an object that contains Fleet app and URL information
 */
export const useAgentDetailsIngestUrl = (
  agentId: string
): { url: string; appId: string; appPath: string } => {
  const { services } = useKibana();
  return useMemo(() => {
    const appPath = `#/fleet/agents/${agentId}/activity`;
    return {
      url: `${services.application.getUrlForApp('fleet')}${appPath}`,
      appId: 'fleet',
      appPath,
    };
  }, [services.application, agentId]);
};
