/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Constants used across the code to limit concurrency of pMap operations
export const MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS = 50;
export const MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_20 = 20;
export const MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_10 = 10;
export const MAX_CONCURRENT_DATASTREAM_OPERATIONS = 50;
export const MAX_CONCURRENT_FLEET_PROXIES_OPERATIONS = 20;
export const MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS = 10;
export const MAX_CONCURRENT_PACKAGE_ASSETS = 5;
export const MAX_CONCURRENT_CREATE_ACTIONS = 50;
export const MAX_CONCURRENT_DATASTREAMS_ILM_OPERATIONS = 50;
export const MAX_CONCURRENT_ILM_POLICIES_OPERATIONS = 50;
export const MAX_CONCURRENT_PIPELINES_DELETIONS = 50;
export const MAX_CONCURRENT_ML_MODELS_OPERATIONS = 50;
export const MAX_CONCURRENT_COMPONENT_TEMPLATES = 50;
export const MAX_CONCURRENT_TRANSFORMS_OPERATIONS = 20;
export const MAX_CONCURRENT_INDEX_PATTERN_OPERATIONS = 50;
export const MAX_CONCURRENT_ES_ASSETS_OPERATIONS = 50;
export const MAX_CONCURRENT_AGENT_FILES_UPLOADS = 50;
export const MAX_CONCURRENT_BACKFILL_OUTPUTS_PRESETS = 20;
export const MAX_CONCURRENT_CLEAN_OLD_FILE_INDICES = 2;