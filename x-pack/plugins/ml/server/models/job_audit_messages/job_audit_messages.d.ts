/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import type { MlClient } from '../../lib/ml_client';
import type { JobSavedObjectService } from '../../saved_objects';
import { JobMessage } from '../../../common/types/audit_message';

export function jobAuditMessagesProvider(
  client: IScopedClusterClient,
  mlClient: MlClient
): {
  getJobAuditMessages: (
    jobSavedObjectService: JobSavedObjectService,
    options: {
      jobId?: string;
      from?: string;
      start?: string;
      end?: string;
    }
  ) => { messages: JobMessage[]; notificationIndices: string[] };
  getAuditMessagesSummary: (jobIds?: string[]) => any;
  clearJobAuditMessages: (jobId: string, notificationIndices: string[]) => any;
};
