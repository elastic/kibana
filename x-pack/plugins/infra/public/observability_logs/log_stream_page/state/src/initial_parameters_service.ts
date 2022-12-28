/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvokeCreator, Receiver } from 'xstate';
import { ParsedQuery } from '../../../log_stream_query_state';
import { LogStreamPageContext, LogStreamPageEvent } from './types';

export const waitForInitialParameters =
  (): InvokeCreator<LogStreamPageContext, LogStreamPageEvent> =>
  (_context, _event) =>
  (send, onEvent: Receiver<LogStreamPageEvent>) => {
    // constituents of the set of initial parameters
    let latestValidQuery: ParsedQuery | undefined;

    onEvent((event) => {
      switch (event.type) {
        // event types that deliver the parameters
        case 'VALID_QUERY_CHANGED':
        case 'INVALID_QUERY_CHANGED':
          latestValidQuery = event.parsedQuery;
          break;
      }

      // if all constituents of the parameters have been delivered
      if (latestValidQuery != null) {
        send({
          type: 'RECEIVED_INITIAL_PARAMETERS',
          validatedQuery: latestValidQuery,
        });
      }
    });
  };
