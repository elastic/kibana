/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PLUGIN_ID } from './plugin';

// Base API paths
export const API_ROOT = `/api/${PLUGIN_ID}`;
export const EPM_API_ROOT = `${API_ROOT}/epm`;
export const DATA_STREAM_API_ROOT = `${API_ROOT}/data_streams`;
export const CONFIG_API_ROOT = `${API_ROOT}/config`;
export const FLEET_API_ROOT = `${API_ROOT}/fleet`;

// EPM API routes
export const EPM_API_ROUTES = {
  LIST_PATTERN: `${EPM_API_ROOT}/list`,
  INFO_PATTERN: `${EPM_API_ROOT}/package/{pkgkey}`,
  INSTALL_PATTERN: `${EPM_API_ROOT}/install/{pkgkey}`,
  DELETE_PATTERN: `${EPM_API_ROOT}/delete/{pkgkey}`,
  CATEGORIES_PATTERN: `${EPM_API_ROOT}/categories`,
};

// Data stream API routes
export const DATA_STREAM_API_ROUTES = {
  LIST_PATTERN: `${DATA_STREAM_API_ROOT}`,
  INFO_PATTERN: `${DATA_STREAM_API_ROOT}/{dataStreamId}`,
  CREATE_PATTERN: `${DATA_STREAM_API_ROOT}`,
  UPDATE_PATTERN: `${DATA_STREAM_API_ROOT}/{dataStreamId}`,
};

// Fleet API routes
export const FLEET_ROUTES = {};

// Config API routes
export const CONFIG_ROUTES = {};
