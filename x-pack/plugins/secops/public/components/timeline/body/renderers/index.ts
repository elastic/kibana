/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { auditAcquiredCredsRowRenderer } from './auditd_acquired_creds_row_renderer';
import { auditDisposedCredsRowRenderer } from './auditd_disposed_creds_row_renderer';
import { auditdEndedSessionRowRenderer } from './auditd_ended_session_row_renderer';
import { auditdExecutedRowRenderer } from './auditd_executed_row_renderer';
import { auditdLoggedinRowRenderer } from './auditd_loggedin_row_renderer';
import { auditdStartedSessionRowRenderer } from './auditd_started_session_row_renderer';
import { auditdWasAuthorizedRowRenderer } from './auditd_was_authorized_row_renderer';
import { ColumnRenderer } from './column_renderer';
import { emptyColumnRenderer } from './empty_column_renderer';
import { netflowRowRenderer } from './netflow/netflow_row_renderer';
import { plainColumnRenderer } from './plain_column_renderer';
import { plainRowRenderer } from './plain_row_renderer';
import { RowRenderer } from './row_renderer';
import { suricataRowRenderer } from './suricata_row_renderer';
import { unknownColumnRenderer } from './unknown_column_renderer';
import { zeekRowRenderer } from './zeek_row_renderer';

export * from './auditd_acquired_creds_row_renderer';
export * from './auditd_ended_session_row_renderer';
export * from './auditd_disposed_creds_row_renderer';
export * from './auditd_executed_row_renderer';
export * from './auditd_started_session_row_renderer';
export * from './auditd_loggedin_row_renderer';
export * from './auditd_was_authorized_row_renderer';
export * from './column_renderer';
export * from './row_renderer';
export * from './empty_column_renderer';
export * from './get_row_renderer';
export * from './get_column_renderer';
export * from './plain_row_renderer';
export * from './plain_column_renderer';
export * from './suricata_row_renderer';
export * from './unknown_column_renderer';
export * from './zeek_row_renderer';

export const rowRenderers: RowRenderer[] = [
  auditdExecutedRowRenderer,
  auditdLoggedinRowRenderer,
  auditdWasAuthorizedRowRenderer,
  auditAcquiredCredsRowRenderer,
  auditdEndedSessionRowRenderer,
  auditDisposedCredsRowRenderer,
  auditdStartedSessionRowRenderer,
  netflowRowRenderer,
  suricataRowRenderer,
  zeekRowRenderer,
].concat(plainRowRenderer); // falls-back to the plain row renderer

export const columnRenderers: ColumnRenderer[] = [
  plainColumnRenderer,
  emptyColumnRenderer,
  unknownColumnRenderer,
];
