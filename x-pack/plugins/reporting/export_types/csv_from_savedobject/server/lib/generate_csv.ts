/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { notImplemented } from 'boom';
import { Request } from 'hapi';
// @ts-ignore
import { createTaggedLogger } from '../../../../server/lib/create_tagged_logger';
import { KbnServer, Logger } from '../../../../types';
import { SearchPanel } from '../../types';
import { generateCsvSearch } from './generate_csv_search';

export function createGenerateCsv(logger: Logger) {
  return async function generateCsv(
    req: Request,
    server: KbnServer,
    visType: string,
    panel: SearchPanel
  ) {
    // This should support any vis type that is able to fetch
    // and model data on the server-side

    // This structure will not be needed when the vis data just consists of an
    // expression that we could run through the interpreter to get csv
    switch (visType) {
      case 'search':
        // @ts-ignore
        const searchPanel: SearchPanel = panel;
        return await generateCsvSearch(req, server, logger, searchPanel);
      default:
        throw notImplemented(`Unsupported or unrecognized saved object type: ${visType}`);
    }
  };
}
