/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewFieldBase } from '@kbn/es-query';
import { ThreatMap, ThreatMapEntry } from '@kbn/securitysolution-io-ts-alerting-types';

export interface FormattedEntry {
  id: string;
  field: DataViewFieldBase | undefined;
  type: 'mapping';
  value: DataViewFieldBase | undefined;
  entryIndex: number;
}

export interface EmptyEntry {
  field: string | undefined;
  type: 'mapping';
  value: string | undefined;
}

export type Entry = ThreatMapEntry | EmptyEntry;

export type ThreatMapEntries = Omit<ThreatMap, 'entries'> & {
  entries: Entry[];
};
