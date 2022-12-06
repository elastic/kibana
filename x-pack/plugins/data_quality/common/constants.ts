/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'dataQuality';
export const PLUGIN_NAME = 'dataQuality';

export const BASE_PATH = '/internal/data_quality';
export const GET_INDEX_STATS = `${BASE_PATH}/stats/{index_name}`;
export const GET_INDEX_MAPPINGS = `${BASE_PATH}/mappings/{index_name}`;
