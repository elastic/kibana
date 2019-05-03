/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { auditdRowRenderers } from './auditd/generic_row_renderer';
import { ColumnRenderer } from './column_renderer';
import { emptyColumnRenderer } from './empty_column_renderer';
import { netflowRowRenderer } from './netflow/netflow_row_renderer';
import { plainColumnRenderer } from './plain_column_renderer';
import { plainRowRenderer } from './plain_row_renderer';
import { RowRenderer } from './row_renderer';
import { suricataRowRenderer } from './suricata/suricata_row_renderer';
import { systemRowRenderers } from './system';
import { unknownColumnRenderer } from './unknown_column_renderer';
import { zeekRowRenderer } from './zeek/zeek_row_renderer';

export * from './args';
export * from './auditd';
export * from './column_renderer';
export * from './empty_column_renderer';
export * from './formatted_field';
export * from './get_column_renderer';
export * from './get_row_renderer';
export * from './helpers';
export * from './host_working_dir';
export * from './netflow';
export * from './plain_column_renderer';
export * from './plain_row_renderer';
export * from './process_draggable';
export * from './row_renderer';
export * from './suricata';
export * from './unknown_column_renderer';
export * from './user_host_working_dir';
export * from './zeek';

export const rowRenderers: RowRenderer[] = [
  ...auditdRowRenderers,
  netflowRowRenderer,
  suricataRowRenderer,
  ...systemRowRenderers,
  zeekRowRenderer,
  plainRowRenderer, // falls-back to the plain row renderer
];

export const columnRenderers: ColumnRenderer[] = [
  plainColumnRenderer,
  emptyColumnRenderer,
  unknownColumnRenderer,
];
