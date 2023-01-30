/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** endpoint data streams that are used for host isolation  */
import { getFileDataIndexName, getFileMetadataIndexName } from '@kbn/fleet-plugin/common';

/** for index patterns `.logs-endpoint.actions-* and .logs-endpoint.action.responses-*`*/
export const ENDPOINT_ACTIONS_DS = '.logs-endpoint.actions';
export const ENDPOINT_ACTIONS_INDEX = `${ENDPOINT_ACTIONS_DS}-default`;
export const ENDPOINT_ACTION_RESPONSES_DS = '.logs-endpoint.action.responses';
export const ENDPOINT_ACTION_RESPONSES_INDEX = `${ENDPOINT_ACTION_RESPONSES_DS}-default`;
// search in all namespaces and not only in default
export const ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN = `${ENDPOINT_ACTION_RESPONSES_DS}-*`;

export const eventsIndexPattern = 'logs-endpoint.events.*';
export const alertsIndexPattern = 'logs-endpoint.alerts-*';

// metadata datastream
export const METADATA_DATASTREAM = 'metrics-endpoint.metadata-default';

/** index pattern for the data source index (data stream) that the Endpoint streams documents to */
export const metadataIndexPattern = 'metrics-endpoint.metadata-*';

/** index that the metadata transform writes to (destination) and that is used by endpoint APIs */
export const metadataCurrentIndexPattern = 'metrics-endpoint.metadata_current_*';

/** The metadata Transform Name prefix with NO (package) version) */
export const metadataTransformPrefix = 'endpoint.metadata_current-default';

// metadata transforms pattern for matching all metadata transform ids
export const METADATA_TRANSFORMS_PATTERN = 'endpoint.metadata_*';

// united metadata transform id
export const METADATA_UNITED_TRANSFORM = 'endpoint.metadata_united-default';

// united metadata transform destination index
export const METADATA_UNITED_INDEX = '.metrics-endpoint.metadata_united_default';

export const policyIndexPattern = 'metrics-endpoint.policy-*';
export const telemetryIndexPattern = 'metrics-endpoint.telemetry-*';

// File storage indexes supporting endpoint Upload/download
export const FILE_STORAGE_METADATA_INDEX = getFileMetadataIndexName('endpoint');
export const FILE_STORAGE_DATA_INDEX = getFileDataIndexName('endpoint');

// Endpoint API routes
export const BASE_ENDPOINT_ROUTE = '/api/endpoint';
export const HOST_METADATA_LIST_ROUTE = `${BASE_ENDPOINT_ROUTE}/metadata`;
export const HOST_METADATA_GET_ROUTE = `${HOST_METADATA_LIST_ROUTE}/{id}`;
export const METADATA_TRANSFORMS_STATUS_ROUTE = `${BASE_ENDPOINT_ROUTE}/metadata/transforms`;

export const BASE_POLICY_RESPONSE_ROUTE = `${BASE_ENDPOINT_ROUTE}/policy_response`;
export const BASE_POLICY_ROUTE = `${BASE_ENDPOINT_ROUTE}/policy`;
export const AGENT_POLICY_SUMMARY_ROUTE = `${BASE_POLICY_ROUTE}/summaries`;

/** Suggestions routes */
export const SUGGESTIONS_ROUTE = `${BASE_ENDPOINT_ROUTE}/suggestions/{suggestion_type}`;

/** Host Isolation Routes */
export const ISOLATE_HOST_ROUTE = `${BASE_ENDPOINT_ROUTE}/isolate`;
export const UNISOLATE_HOST_ROUTE = `${BASE_ENDPOINT_ROUTE}/unisolate`;

const BASE_ENDPOINT_ACTION_ROUTE = `${BASE_ENDPOINT_ROUTE}/action`;

/** Action Response Routes */
export const ISOLATE_HOST_ROUTE_V2 = `${BASE_ENDPOINT_ACTION_ROUTE}/isolate`;
export const UNISOLATE_HOST_ROUTE_V2 = `${BASE_ENDPOINT_ACTION_ROUTE}/unisolate`;
export const GET_PROCESSES_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/running_procs`;
export const KILL_PROCESS_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/kill_process`;
export const SUSPEND_PROCESS_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/suspend_process`;
export const GET_FILE_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/get_file`;

/** Endpoint Actions Routes */
export const ENDPOINT_ACTION_LOG_ROUTE = `${BASE_ENDPOINT_ROUTE}/action_log/{agent_id}`;
export const ACTION_STATUS_ROUTE = `${BASE_ENDPOINT_ROUTE}/action_status`;
export const ACTION_DETAILS_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/{action_id}`;
export const ACTION_AGENT_FILE_INFO_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/{action_id}/{agent_id}/file`;
export const ACTION_AGENT_FILE_DOWNLOAD_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/{action_id}/{agent_id}/file/download`;
export const ENDPOINTS_ACTION_LIST_ROUTE = `${BASE_ENDPOINT_ROUTE}/action`;

export const failedFleetActionErrorCode = '424';

export const ENDPOINT_DEFAULT_PAGE = 0;
export const ENDPOINT_DEFAULT_PAGE_SIZE = 10;

export const ENDPOINT_ERROR_CODES: Record<string, number> = {
  ES_CONNECTION_ERROR: -272,
};

export const ENDPOINT_FIELDS_SEARCH_STRATEGY = 'endpointFields';

/** for index patterns `.logs-osquery_manager.actions-*` */
export const OSQUERY_BASE = '.logs-osquery_manager';
export const OSQUERY_ACTIONS_DS = `${OSQUERY_BASE}.actions`;
export const OSQUERY_RESULTS_DS = `${OSQUERY_BASE}.results`;
export const OSQUERY_ACTIONS_INDEX = `${OSQUERY_ACTIONS_DS}-*`;
export const OSQUERY_ACTION_RESPONSES_DS = `${OSQUERY_BASE}.action.responses`;
export const OSQUERY_ACTION_RESPONSES_INDEX = `${OSQUERY_ACTION_RESPONSES_DS}-*`;

export const OSQUERY_LIVE_QUERY_ROUTE = `/api/osquery/live_queries`;
