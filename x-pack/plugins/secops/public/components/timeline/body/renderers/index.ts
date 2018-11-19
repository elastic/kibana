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
import { unknownColumnRenderer } from './unknown_column_renderer';

export * from './column_renderer';
export * from './row_renderer';
export * from './empty_column_renderer';
export * from './get_row_renderer';
export * from './get_column_renderer';
export * from './plain_row_renderer';
export * from './plain_column_renderer';
export * from './suricata_column_renderer';
export * from './suricata_row_renderer';
export * from './unknown_column_renderer';

export const rowRenderers: RowRenderer[] = [suricataRowRenderer, plainRowRenderer];

export const columnRenderers: ColumnRenderer[] = [
  suricataColumnRenderer,
  plainColumnRenderer,
  emptyColumnRenderer,
  unknownColumnRenderer,
];

export const getSuricataCVEFromSignature = (signature?: string): string | null => {
  const regex = /CVE-[0-9]*-[0-9]*/;
  const found = (signature && signature.match(regex)) || false;
  if (found) {
    return encodeURIComponent(found[0]);
  } else {
    return null;
  }
};

export const createLinkWithSignature = (signature: string): string => {
  const cve = getSuricataCVEFromSignature(signature);
  if (cve != null) {
    return `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${cve}`;
  } else {
    return `https://www.google.com/search?q=${encodeURIComponent(signature)}`;
  }
};

export const EMPTY_VALUE = '--';
