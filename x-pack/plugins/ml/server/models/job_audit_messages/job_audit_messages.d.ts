/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import type { MlClient } from '../../lib/ml_client';
import type { JobSavedObjectService } from '../../saved_objects';

export function jobAuditMessagesProvider(
  client: IScopedClusterClient,
  mlClient: MlClient
): {
  getJobAuditMessages: (
    jobSavedObjectService: JobSavedObjectService,
    jobId?: string,
    from?: string
  ) => any;
  getAuditMessagesSummary: (jobIds?: string[]) => any;
};
