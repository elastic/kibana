/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_DETECTION_ENGINE_URL as INTERNAL } from '../../../constants';

const BASE_URL = `${INTERNAL}/external_rule_sources` as const;

export const CREATE_EXTERNAL_RULE_SOURCE = `${BASE_URL}/_create` as const;
export const READ_EXTERNAL_RULE_SOURCES = `${BASE_URL}/_find` as const;
export const UPDATE_EXTERNAL_RULE_SOURCE = `${BASE_URL}/_update` as const;
export const DELETE_EXTERNAL_RULE_SOURCE = `${BASE_URL}/_delete` as const;
