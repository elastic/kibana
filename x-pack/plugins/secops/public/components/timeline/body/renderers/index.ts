/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ColumnRenderer } from './column_renderer';
import { emptyColumnRenderer } from './empty_column_renderer';
import { plainColumnRenderer } from './plain_column_renderer';
import { plainRowRenderer } from './plain_row_renderer';
import { RowRenderer } from './row_renderer';
import { suricataColumnRenderer } from './suricata_column_renderer';
import { suricataRowRenderer } from './suricata_row_renderer';

export { ColumnRenderer } from './column_renderer';
export { RowRenderer } from './row_renderer';
export { emptyColumnRenderer } from './empty_column_renderer';
export { getRowRenderer } from './get_row_renderer';
export { getColumnRenderer } from './get_column_renderer';
export { plainRowRenderer } from './plain_row_renderer';
export { plainColumnRenderer } from './plain_column_renderer';
export { suricataColumnRenderer } from './suricata_column_renderer';
export { suricataRowRenderer } from './suricata_row_renderer';

export const rowRenderers: RowRenderer[] = [suricataRowRenderer, plainRowRenderer];
export const columnRenderers: ColumnRenderer[] = [
  suricataColumnRenderer,
  plainColumnRenderer,
  emptyColumnRenderer,
];

export const getSuricataCVEFromSignature = (signature: string): string | null => {
  const regex = /CVE-[0-9]*-[0-9]*/;
  const found = signature.match(regex);
  if (found) {
    return found[0];
  } else {
    return null;
  }
};

export const createLinkWithSignature = (signature: string) => {
  const cve = getSuricataCVEFromSignature(signature);
  if (cve) {
    return `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${cve}`;
  } else {
    return `https://www.google.com/search?q=${signature}`;
  }
};
