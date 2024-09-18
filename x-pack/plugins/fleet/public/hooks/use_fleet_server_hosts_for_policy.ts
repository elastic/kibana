/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { AgentPolicy } from '../types';

import { useGetEnrollmentSettings } from './use_request';

/**
 * Return Fleet server hosts urls and proxy for a given agent policy
 */
export function useFleetServerHostsForPolicy(agentPolicy?: AgentPolicy | null) {
  const {
    isLoading,
    isInitialRequest,
    data: enrollmentSettings,
  } = useGetEnrollmentSettings({ agentPolicyId: agentPolicy?.id });

  return useMemo(
    () => ({
      isLoadingInitialRequest: isLoading && isInitialRequest,
      fleetServerHost: enrollmentSettings?.fleet_server.host?.host_urls[0] || '',
      fleetProxy: enrollmentSettings?.fleet_server.host_proxy,
      downloadSource: enrollmentSettings?.download_source,
    }),
    [
      isLoading,
      isInitialRequest,
      enrollmentSettings?.fleet_server.host,
      enrollmentSettings?.fleet_server.host_proxy,
      enrollmentSettings?.download_source,
    ]
  );
}
