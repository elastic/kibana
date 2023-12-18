/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';

export const FEATURE_KEYS = {
  HOST_ISOLATION: 'Host isolation',
  HOST_ISOLATION_EXCEPTION: 'Host isolation exception',
  HOST_ISOLATION_EXCEPTION_BY_POLICY: 'Host isolation exception by policy',
  TRUSTED_APP_BY_POLICY: 'Trusted app by policy',
  EVENT_FILTERS_BY_POLICY: 'Event filters by policy',
  BLOCKLIST_BY_POLICY: 'Blocklists by policy',
  RANSOMWARE_PROTECTION: 'Ransomeware protection',
  MEMORY_THREAT_PROTECTION: 'Memory threat protection',
  BEHAVIOR_PROTECTION: 'Behavior protection',
  KILL_PROCESS: 'Kill process',
  SUSPEND_PROCESS: 'Suspend process',
  RUNNING_PROCESSES: 'Get running processes',
  GET_FILE: 'Get file',
  UPLOAD: 'Upload file',
  EXECUTE: 'Execute command',
  ALERTS_BY_PROCESS_ANCESTRY: 'Get related alerts by process ancestry',
  ENDPOINT_EXCEPTIONS: 'Endpoint exceptions',
} as const;

export type FeatureKeys = keyof typeof FEATURE_KEYS;

const RESPONSE_ACTIONS_FEATURE_KEY: Readonly<Record<ResponseActionsApiCommandNames, FeatureKeys>> =
  {
    isolate: 'HOST_ISOLATION',
    unisolate: 'HOST_ISOLATION',
    'kill-process': 'KILL_PROCESS',
    'suspend-process': 'SUSPEND_PROCESS',
    'running-processes': 'RUNNING_PROCESSES',
    'get-file': 'GET_FILE',
    execute: 'EXECUTE',
    upload: 'UPLOAD',
  };

export const getResponseActionFeatureKey = (
  responseAction: ResponseActionsApiCommandNames
): FeatureKeys | undefined => {
  return RESPONSE_ACTIONS_FEATURE_KEY[responseAction];
};
