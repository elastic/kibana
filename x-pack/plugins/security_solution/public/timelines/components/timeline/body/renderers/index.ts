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
import { unknownColumnRenderer } from './unknown_column_renderer';
import { zeekRowRenderer } from './zeek/zeek_row_renderer';
import { systemRowRenderers } from './system/generic_row_renderer';

// The row renderers are order dependent and will return the first renderer
// which returns true from its isInstance call. The bottom renderers which
// are netflowRenderer and plainRowRenderer are the most accepting where
// netflowRowRenderer returns true on any netflow related data set including
// Suricata and Zeek which is why Suricata and Zeek are above it. The
// plainRowRenderer always returns true to everything which is why it always
// should be last.
export const rowRenderers: RowRenderer[] = [
  ...auditdRowRenderers,
  ...systemRowRenderers,
  suricataRowRenderer,
  zeekRowRenderer,
  netflowRowRenderer,
  plainRowRenderer, // falls-back to the plain row renderer
];

export const columnRenderers: ColumnRenderer[] = [
  plainColumnRenderer,
  emptyColumnRenderer,
  unknownColumnRenderer,
];
