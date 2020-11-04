/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const eventsIndexPattern = 'logs-endpoint.events.*';
export const alertsIndexPattern = 'logs-endpoint.alerts-*';
export const metadataIndexPattern = 'metrics-endpoint.metadata-*';
export const metadataCurrentIndexPattern = 'metrics-endpoint.metadata_current_*';
export const metadataTransformPrefix = 'endpoint.metadata_current-default';
export const policyIndexPattern = 'metrics-endpoint.policy-*';
export const telemetryIndexPattern = 'metrics-endpoint.telemetry-*';
export const LIMITED_CONCURRENCY_ENDPOINT_ROUTE_TAG = 'endpoint:limited-concurrency';
export const LIMITED_CONCURRENCY_ENDPOINT_COUNT = 100;

export const TRUSTED_APPS_SUPPORTED_OS_TYPES: readonly string[] = ['macos', 'windows', 'linux'];
export const TRUSTED_APPS_LIST_API = '/api/endpoint/trusted_apps';
export const TRUSTED_APPS_CREATE_API = '/api/endpoint/trusted_apps';
export const TRUSTED_APPS_DELETE_API = '/api/endpoint/trusted_apps/{id}';
