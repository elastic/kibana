/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SENTINELONE_TITLE = 'Sentinel One';
export const SENTINELONE_CONNECTOR_ID = '.sentinelone';
export const API_MAX_RESULTS = 1000;

export enum SUB_ACTION {
  EXECUTE_SCRIPT = 'executeScript',
  GET_AGENTS = 'getAgents',
  ISOLATE_HOST = 'isolateHost',
  RELEASE_HOST = 'releaseHost',
  GET_REMOTE_SCRIPTS = 'getRemoteScripts',
  GET_REMOTE_SCRIPT_STATUS = 'getRemoteScriptStatus',
  GET_REMOTE_SCRIPT_RESULTS = 'getRemoteScriptResults',
  FETCH_AGENT_FILES = 'fetchAgentFiles',
  DOWNLOAD_AGENT_FILE = 'downloadAgentFile',
  GET_ACTIVITIES = 'getActivities',
}
