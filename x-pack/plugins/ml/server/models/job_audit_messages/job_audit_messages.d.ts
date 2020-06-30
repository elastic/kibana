/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';

export function jobAuditMessagesProvider(
  callAsCurrentUser: LegacyAPICaller
): {
  getJobAuditMessages: (jobId?: string, from?: string) => any;
  getAuditMessagesSummary: (jobIds?: string[]) => any;
};
