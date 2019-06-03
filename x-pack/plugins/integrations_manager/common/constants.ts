/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ID = 'integrations_manager';
export const SAVED_OBJECT_TYPE = 'integrations-manager';
export const API_ROOT = `/api/${ID}`;
export const API_INTEGRATIONS_LIST = `${API_ROOT}/list`;
export const API_INTEGRATIONS_INFO = `${API_ROOT}/package/{pkgkey}`;
export const API_INTEGRATIONS_FILE = `${API_ROOT}/package/{pkgkey}/get`;
