/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OutputError } from '@kbn/securitysolution-es-utils';

export type SavedObjectTemplate = 'hostRiskScoreDashboards' | 'userRiskScoreDashboards';

export interface BulkCreateSavedObjectsResult {
  hostRiskScoreDashboards?: {
    success: boolean;
    error: OutputError;
    body?: { id: string; name: string; type: string };
  };
  userRiskScoreDashboards?: {
    success: boolean;
    error: OutputError;
    body?: { id: string; name: string; type: string };
  };
}
