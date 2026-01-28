/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Transform IDs
export const SERVICE_MAP_EDGES_TRANSFORM_ID = 'apm-service-map-edges';
export const SERVICE_MAP_ENTRY_POINTS_TRANSFORM_ID = 'apm-service-entry-points';

// Destination index names (using .apm- prefix for Kibana system user permissions)
export const SERVICE_MAP_EDGES_INDEX = '.apm-service-map-edges';
export const SERVICE_MAP_ENTRY_POINTS_INDEX = '.apm-service-entry-points';

// Transform settings
export const SERVICE_MAP_TRANSFORM_FREQUENCY = '1m';
export const SERVICE_MAP_TRANSFORM_SYNC_DELAY = '60s';
export const SERVICE_MAP_TRANSFORM_SYNC_FIELD = '@timestamp';

// Resource version for tracking updates (increment when templates/transforms change)
export const SERVICE_MAP_TRANSFORM_VERSION = 8;
