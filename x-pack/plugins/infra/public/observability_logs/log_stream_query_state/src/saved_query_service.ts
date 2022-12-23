/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryStart } from '@kbn/data-plugin/public';
import { InvokeCreator } from 'xstate';
import { LogStreamQueryContext, LogStreamQueryEvent } from './types';

export const resolveSavedQueryId =
  ({
    savedQueriesService,
  }: {
    savedQueriesService: QueryStart['savedQueries'];
  }): InvokeCreator<LogStreamQueryContext, LogStreamQueryEvent> =>
  async (context, event) => {
    const savedQuery = await savedQueriesService.getSavedQuery(context.savedQueryId);
    return { query: savedQuery.attributes.query, filters: savedQuery.attributes.filters };

    // NOTE: We can't rely on just passing a savedQueryId to the stateful search bar

    // TODO: Saved queries can contain the timefilter, this crosses concerns with another machine, need to discuss
    // as we might need to hoist the savedQuery resolution to the page state machine
    // or we can just have both machines (query and time) potentially resolve the savec query ID, as they both need to report initial parameters to the page state machine anyway,
    // however this would result in two calls for the saved object

    // timefilter
    // if (savedQuery.attributes.timefilter) {
    //   timefilter.setTime({
    //     from: savedQuery.attributes.timefilter.from,
    //     to: savedQuery.attributes.timefilter.to,
    //   });
    //   if (savedQuery.attributes.timefilter.refreshInterval) {
    //     timefilter.setRefreshInterval(savedQuery.attributes.timefilter.refreshInterval);
    //   }
    // }
  };
