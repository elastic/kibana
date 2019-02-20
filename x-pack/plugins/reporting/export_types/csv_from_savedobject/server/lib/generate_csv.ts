/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest, notImplemented } from 'boom';
import { Request } from 'hapi';
import { KbnServer } from '../../../../types';
import { TimelionPanel, TsvbPanel } from '../../types';
import { generateCsvTsvb } from './generate_csv_tsvb';

interface CsvResult {
  type: string;
  rows: string[] | null;
}

export async function generateCsv(
  req: Request,
  server: KbnServer,
  visType: string,
  panel: TsvbPanel | TimelionPanel,
  isImmediate: boolean
): Promise<CsvResult> {
  switch (visType) {
    case 'metrics':
      // @ts-ignore Type 'TsvbPanel | TimelionPanel' is not assignable to
      // type 'TsvbPanel'.  Type 'TimelionPanel' is not assignable to type
      // 'TsvbPanel'.    Property 'filter' is missing in type
      // 'TimelionPanel'.
      const tsvbPanel: TsvbPanel = panel;
      return await generateCsvTsvb(req, server, tsvbPanel, isImmediate);
    case 'timelion':
      throw notImplemented('Timelion is not yet supported by this API');
    default:
      throw badRequest(`Unsupported or unrecognized saved object type: ${visType}`);
  }
}
