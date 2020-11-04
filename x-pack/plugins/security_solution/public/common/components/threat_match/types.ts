/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ThreatMap, ThreatMapEntry } from '../../../../common/detection_engine/schemas/types';
import { IFieldType } from '../../../../../../../src/plugins/data/common';

export interface FormattedEntry {
  field: IFieldType | undefined;
  type: 'mapping';
  value: IFieldType | undefined;
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
