/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface AuditdEcs {
  result?: string[];

  session?: string[];

  data?: AuditdDataEcs;

  summary?: SummaryEcs;

  sequence?: string[];
}

export interface AuditdDataEcs {
  acct?: string[];

  terminal?: string[];

  op?: string[];
}

export interface SummaryEcs {
  actor?: PrimarySecondaryEcs;

  object?: PrimarySecondaryEcs;

  how?: string[];

  message_type?: string[];

  sequence?: string[];
}

export interface PrimarySecondaryEcs {
  primary?: string[];

  secondary?: string[];

  type?: string[];
}
