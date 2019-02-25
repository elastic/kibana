/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest, notImplemented } from 'boom';
import { Request } from 'hapi';
import { KbnServer } from '../../../../types';
// @ts-ignore
import { createTaggedLogger } from '../../../../server/lib/create_tagged_logger';
import { SearchPanel, TsvbPanel } from '../../types';
import { generateCsvSearch } from './generate_csv_search';
import { generateCsvTsvb } from './generate_csv_tsvb';

interface CsvResult {
  type: string;
  rows: string[] | null;
}

export async function generateCsv(
  req: Request,
  server: KbnServer,
  visType: string,
  panel: TsvbPanel | SearchPanel
): Promise<CsvResult> {
  const logger = {
    debug: createTaggedLogger(server, ['reporting', 'csv', 'debug']),
    warning: createTaggedLogger(server, ['reporting', 'csv', 'warning']),
    error: createTaggedLogger(server, ['reporting', 'csv', 'error']),
  };

  switch (visType) {
    case 'metrics':
      // @ts-ignore
      const tsvbPanel: TsvbPanel = panel;
      return await generateCsvTsvb(req, server, logger, tsvbPanel);
    case 'search':
      // @ts-ignore
      const searchPanel: SearchPanel = panel;
      return await generateCsvSearch(req, server, logger, searchPanel);
    case 'timelion':
      throw notImplemented('Timelion is not yet supported by this API');
    default:
      throw badRequest(`Unsupported or unrecognized saved object type: ${visType}`);
  }
}
