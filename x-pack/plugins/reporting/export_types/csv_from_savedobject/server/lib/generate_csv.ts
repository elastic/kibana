/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest, notImplemented } from 'boom';
import { Request } from 'hapi';
// @ts-ignore
import { createTaggedLogger } from '../../../../server/lib/create_tagged_logger';
import { KbnServer, Logger } from '../../../../types';
import { SearchPanel, TsvbPanel } from '../../types';
import { generateCsvSearch } from './generate_csv_search';
import { generateCsvTsvb } from './generate_csv_tsvb';

export function createGenerateCsv(logger: Logger) {
  return async function generateCsv(
    req: Request,
    server: KbnServer,
    visType: string,
    panel: TsvbPanel | SearchPanel
  ) {
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
  };
}
