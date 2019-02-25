/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { KbnServer } from '../../../../types';
import { SearchSource } from '../../types';

interface CsvResult {
  type: string;
  rows: string[] | null;
}

export async function generateCsvSearch(
  req: Request,
  server: KbnServer,
  searchPanel: SearchSource
): Promise<CsvResult> {
  return {
    type: 'CSV from Saved Search',
    rows: ['one,two,three', 'a,b,c'],
  };
}
