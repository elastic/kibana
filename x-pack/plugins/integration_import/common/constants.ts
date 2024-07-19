/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-plugin/common/types';

// Plugin information
export const PLUGIN_ID = 'integrationImport';

// Server API Routes
export const INTEGRATION_IMPORT_BASE_PATH = '/api/integration_import';

export const ECS_GRAPH_PATH = `${INTEGRATION_IMPORT_BASE_PATH}/ecs`;
export const CATEGORIZATION_GRAPH_PATH = `${INTEGRATION_IMPORT_BASE_PATH}/categorization`;
export const RELATED_GRAPH_PATH = `${INTEGRATION_IMPORT_BASE_PATH}/related`;
export const CHECK_PIPELINE_PATH = `${INTEGRATION_IMPORT_BASE_PATH}/pipeline`;
export const INTEGRATION_BUILDER_PATH = `${INTEGRATION_IMPORT_BASE_PATH}/build`;
export const FLEET_PACKAGES_PATH = `/api/fleet/epm/packages`;

// License
export const MINIMUM_LICENSE_TYPE: LicenseType = 'enterprise';
