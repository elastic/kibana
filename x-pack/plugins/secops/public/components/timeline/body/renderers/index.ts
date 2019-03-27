/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { auditdRowRenderers } from './auditd/generic_row_renderer';
import { ColumnRenderer } from './column_renderer';
import { emptyColumnRenderer } from './empty_column_renderer';
import { plainColumnRenderer } from './plain_column_renderer';
import { plainRowRenderer } from './plain_row_renderer';
import { RowRenderer } from './row_renderer';
import { suricataRowRenderer } from './suricata_row_renderer';
import { unknownColumnRenderer } from './unknown_column_renderer';
import { zeekRowRenderer } from './zeek_row_renderer';

export * from './auditd';
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
  zeekRowRenderer,
  suricataRowRenderer,
  ...auditdRowRenderers,
  plainRowRenderer,
];

export const columnRenderers: ColumnRenderer[] = [
  plainColumnRenderer,
  emptyColumnRenderer,
  unknownColumnRenderer,
];
