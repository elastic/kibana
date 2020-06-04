/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest } from 'boom';
import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { ReportingCore } from '../../../..';
import { LevelLogger } from '../../../../lib';
import { FakeRequest, JobParamsPanelCsv, SearchPanel, VisPanel } from '../../types';
import { generateCsvSearch } from './generate_csv_search';

export function createGenerateCsv(reporting: ReportingCore, logger: LevelLogger) {
  return async function generateCsv(
    context: RequestHandlerContext,
    request: KibanaRequest | FakeRequest,
    visType: string,
    panel: VisPanel | SearchPanel,
    jobParams: JobParamsPanelCsv
  ) {
    // This should support any vis type that is able to fetch
    // and model data on the server-side

    // This structure will not be needed when the vis data just consists of an
    // expression that we could run through the interpreter to get csv
    switch (visType) {
      case 'search':
        return await generateCsvSearch(
          reporting,
          context,
          request as KibanaRequest,
          panel as SearchPanel,
          jobParams,
          logger
        );
      default:
        throw badRequest(`Unsupported or unrecognized saved object type: ${visType}`);
    }
  };
}
