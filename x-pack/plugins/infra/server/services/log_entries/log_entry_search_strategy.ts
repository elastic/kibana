/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../../../../../src/plugins/data/common';
import {
  ISearchStrategy,
  PluginStart as DataPluginStart,
} from '../../../../../../src/plugins/data/server';
import { LogEntrySearchRequestParams } from '../../../common/search_strategies/log_entries/log_entry';

type LogEntrySearchRequest = IKibanaSearchRequest<LogEntrySearchRequestParams>;
type LogEntrySearchResponse = IKibanaSearchResponse<null>;

export const logEntrySearchStrategyProvider = ({
  data,
}: {
  data: DataPluginStart;
}): ISearchStrategy<LogEntrySearchRequest, LogEntrySearchResponse> => {
  const esSearchStrategy = data.search.getSearchStrategy('es');

  return {
    search: (request, options, context) => {
      esSearchStrategy.search({}); // TODO: what is id?
      return of({ rawResponse: null });
    },
    cancel: async (context, id) => {
      return Promise.resolve(undefined);
    },
  };
};
