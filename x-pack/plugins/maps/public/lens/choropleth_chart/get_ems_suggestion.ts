/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileLayer } from '@elastic/ems-client';
import type { Datatable } from 'src/plugins/expressions/public';
import { emsAutoSuggest } from '../../ems_autosuggest';

export function getEmsSuggestion(
  emsFileLayers: FileLayer[],
  table: Datatable,
  regionAccessor: string
) {
  const keys: string[] = [];
  table.rows.forEach((row) => {
    const key = row[regionAccessor];
    if (key && key !== '__other__' && !keys.includes(key)) {
      keys.push(key);
    }
  });
  return emsAutoSuggest({ sampleValues: keys }, emsFileLayers);
}
