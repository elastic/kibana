/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest } from 'boom';
import { Request } from 'hapi';
import { KbnServer, Logger, JobParams } from '../../../../types';
import { SearchPanel, VisPanel } from '../../';
import { generateCsvSearch } from './generate_csv_search';

interface FakeRequest {
  headers: any;
  getBasePath: (opts: any) => string;
  server: KbnServer;
}

export function createGenerateCsv(logger: Logger) {
  return async function generateCsv(
    request: Request | FakeRequest,
    server: KbnServer,
    visType: string,
    panel: VisPanel | SearchPanel,
    jobParams: JobParams
  ) {
    // This should support any vis type that is able to fetch
    // and model data on the server-side

    // This structure will not be needed when the vis data just consists of an
    // expression that we could run through the interpreter to get csv
    switch (visType) {
      case 'search':
        return await generateCsvSearch(
          request as Request,
          server,
          logger,
          panel as SearchPanel,
          jobParams
        );
      default:
        throw badRequest(`Unsupported or unrecognized saved object type: ${visType}`);
    }
  };
}
