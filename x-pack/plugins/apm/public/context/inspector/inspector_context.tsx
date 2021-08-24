/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactNode, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  RequestAdapter,
  RequestStatus,
} from '../../../../../../src/plugins/inspector/common';
import { InspectResponse } from '../../../typings/common';
import { FetcherResult, FETCH_STATUS } from '../../hooks/use_fetcher';

export interface InspectorContextValue {
  addInspectorRequest: <Data>(result: FetcherResult<Data>) => void;
  inspectorAdapters: { requests: RequestAdapter };
}

const value: InspectorContextValue = {
  addInspectorRequest,
  inspectorAdapters: { requests: new RequestAdapter() },
};

function getStatus(fetcherStatus: FETCH_STATUS) {
  switch (fetcherStatus) {
    case FETCH_STATUS.FAILURE:
      return RequestStatus.ERROR;
    case FETCH_STATUS.SUCCESS:
      return RequestStatus.OK;
    default:
      return RequestStatus.PENDING;
  }
}

function addInspectorRequest(
  result: FetcherResult<{ _inspect?: InspectResponse }>
) {
  const { inspectorAdapters } = value;
  const requestStatus = getStatus(result.status);

  result.data?._inspect?.forEach((operation) => {
    const requestParams = {
      id: operation.operationName,
      name: operation.operationName,
      // Taken from https://github.com/smith/kibana/blob/b1202c2a42a878069350797e70b2950d69d78027/src/plugins/data/common/search/search_source/inspect/inspector_stats.ts#L29
      // TODO: Fill in all (or most of) the stats
      stats: {
        indexPattern: {
          label: 'Index pattern',
          value: operation.requestParams.index,
          description:
            'The index pattern that connected to the Elasticsearch indices.',
        },
      },
    };
    const requestResponder = inspectorAdapters.requests.start(
      operation.operationName,
      requestParams
    );
    requestResponder.json(operation.requestParams.body as object);

    if (requestStatus !== RequestStatus.PENDING) {
      requestResponder.finish(requestStatus, { json: operation.response });
    }
  });
}

export const InspectorContext = createContext<InspectorContextValue>(value);

export function InspectorContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const history = useHistory();
  const { inspectorAdapters } = value;

  useEffect(() => {
    history.listen(() => {
      inspectorAdapters.requests.reset();
    });
  }, [history, inspectorAdapters]);

  return (
    <InspectorContext.Provider value={value}>
      {children}
    </InspectorContext.Provider>
  );
}
