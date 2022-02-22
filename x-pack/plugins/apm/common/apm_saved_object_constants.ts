/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// the types have to match the names of the saved object mappings
// in /x-pack/plugins/apm/mappings.json

// APM indices (legacy)
/**
 * Should use APM_INDICES_SPACE_SAVED_OBJECT_TYPE instead
 * @deprecated
 * */
export const APM_INDICES_SAVED_OBJECT_TYPE = 'apm-indices';
/**
 * Should use APM_INDICES_SPACE_SAVED_OBJECT_ID instead
 * @deprecated
 * */
export const APM_INDICES_SAVED_OBJECT_ID = 'apm-indices';

// APM indices (space aware)
export const APM_INDICES_SPACE_SAVED_OBJECT_TYPE = 'apm-indices-space';
export const APM_INDICES_SPACE_SAVED_OBJECT_ID = 'apm-indices-space';

// APM telemetry
export const APM_TELEMETRY_SAVED_OBJECT_TYPE = 'apm-telemetry';
export const APM_TELEMETRY_SAVED_OBJECT_ID = 'apm-telemetry';

// APM Server schema
export const APM_SERVER_SCHEMA_SAVED_OBJECT_TYPE = 'apm-server-schema';
export const APM_SERVER_SCHEMA_SAVED_OBJECT_ID = 'apm-server-schema';
