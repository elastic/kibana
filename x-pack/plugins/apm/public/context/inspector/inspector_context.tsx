/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  RequestAdapter,
  RequestResponder,
  RequestStatistics,
  RequestStatus,
} from '../../../../../../src/plugins/inspector/common';
import { InspectResponse } from '../../../typings/common';
import { FetcherResult, FETCH_STATUS } from '../../hooks/use_fetcher';

export interface InspectorContextValue {
  addInspectorRequest: <Data>(result: FetcherResult<Data>) => void;
  inspectorAdapters: { requests: RequestAdapter };
}

const value: InspectorContextValue = {
  addInspectorRequest: () => {},
  inspectorAdapters: { requests: new RequestAdapter() },
};

/**
 * Convert `useFetcher`'s `FETCH_STATUS` to inspector plugin's `RequestStatus`.
 */
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

/**
 * Get statistics to show on tab.
 *
 * If you're using searchSource (which we're not), this gets populated from
 * https://github.com/elastic/kibana/blob/c7d742cb8b8935f3812707a747a139806e4be203/src/plugins/data/common/search/search_source/inspect/inspector_stats.ts
 *
 * We do most of the same here, but not using searchSource.
 */
function getStats(operation: InspectResponse[0]) {
  const stats: RequestStatistics = {
    indexPattern: {
      label: i18n.translate('xpack.apm.inspector.stats.indexPatternLabel', {
        defaultMessage: 'Index pattern',
      }),
      value: operation.requestParams.index,
      description: i18n.translate(
        'xpack.apm.inspector.stats.indexPatternDescription',
        {
          defaultMessage:
            'The index pattern that connected to the Elasticsearch indices.',
        }
      ),
    },
    queryTime: {
      label: i18n.translate('xpack.apm.inspector.stats.queryTimeLabel', {
        defaultMessage: 'Query time',
      }),
      value: i18n.translate('xpack.apm.inspector.stats.queryTimeValue', {
        defaultMessage: '{queryTime}ms',
        values: { queryTime: operation.response.took },
      }),
      description: i18n.translate(
        'xpack.apm.inspector.stats.queryTimeDescription',
        {
          defaultMessage:
            'The time it took to process the query. ' +
            'Does not include the time to send the request or parse it in the browser.',
        }
      ),
    },
  };

  if (operation.response.hits) {
    stats.hits = {
      label: i18n.translate('xpack.apm.inspector.stats.hitsLabel', {
        defaultMessage: 'Hits',
      }),
      value: `${operation.response.hits.hits.length}`,
      description: i18n.translate('xpack.apm.inspector.stats.hitsDescription', {
        defaultMessage: 'The number of documents returned by the query.',
      }),
    };
  }

  if (operation.response.hits?.total !== undefined) {
    const total = operation.response.hits.total as {
      relation: string;
      value: number;
    };
    const hitsTotalValue =
      total.relation === 'eq' ? `${total.value}` : `> ${total.value}`;

    stats.hitsTotal = {
      label: i18n.translate('xpack.apm.inspector.stats.hitsTotalLabel', {
        defaultMessage: 'Hits (total)',
      }),
      value: hitsTotalValue,
      description: i18n.translate(
        'xpack.apm.inspector.stats.hitsTotalDescription',
        {
          defaultMessage: 'The number of documents that match the query.',
        }
      ),
    };
  }
  return stats;
}

export const InspectorContext = createContext<InspectorContextValue>(value);

export function InspectorContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const history = useHistory();
  const { inspectorAdapters } = value;
  const [responders, setResponders] = useState<
    Record<string, RequestResponder>
  >({});

  function addInspectorRequest(
    result: FetcherResult<{ _inspect?: InspectResponse }>
  ) {
    const requestStatus = getStatus(result.status);

    result.data?._inspect?.forEach((operation) => {
      let requestResponder: RequestResponder;

      const requestParams = {
        id: operation.operationName,
        name: operation.operationName,
      };

      if (responders[operation.operationName]) {
        requestResponder = responders[operation.operationName];
      } else {
        requestResponder = inspectorAdapters.requests.start(
          operation.operationName,
          requestParams
        );
        setResponders((prevResponders) => ({
          ...prevResponders,
          [operation.operationName]: requestResponder,
        }));
      }

      requestResponder.json(operation.requestParams.body as object);

      if (requestStatus !== RequestStatus.PENDING) {
        requestResponder.stats(getStats(operation));
        requestResponder.finish(requestStatus, { json: operation.response });
      }
    });
  }

  useEffect(() => {
    history.listen(() => {
      inspectorAdapters.requests.reset();
    });
  }, [history, inspectorAdapters]);

  return (
    <InspectorContext.Provider value={{ ...value, addInspectorRequest }}>
      {children}
    </InspectorContext.Provider>
  );
}
