/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PassThrough } from 'stream';

import { SearchResponse } from 'elasticsearch';

import { ElasticListItemReturnType, DataClient } from '../../types';

/**
 * How many results to page through from the network at a time
 * using search_after
 */
export const SIZE = 100;

interface ExportListItemsToStreamOptions {
  listId: string;
  dataClient: DataClient;
  listsItemsIndex: string;
  stream: PassThrough;
  stringToAppend: string | null | undefined;
}

export const exportListItemsToStream = ({
  listId,
  dataClient,
  stream,
  listsItemsIndex,
  stringToAppend,
}: ExportListItemsToStreamOptions): void => {
  // Use a timeout to start the reading process on the next tick.
  // and prevent the async await from bubbling up to the caller
  setTimeout(async () => {
    let searchAfter = await writeNextResponse({
      listId,
      dataClient,
      stream,
      listsItemsIndex,
      searchAfter: undefined,
      stringToAppend,
    });
    while (searchAfter != null) {
      searchAfter = await writeNextResponse({
        listId,
        dataClient,
        stream,
        listsItemsIndex,
        searchAfter,
        stringToAppend,
      });
    }
    stream.end();
  });
};

interface WriteNextResponseOptions {
  listId: string;
  dataClient: DataClient;
  listsItemsIndex: string;
  stream: PassThrough;
  searchAfter: string[] | undefined;
  stringToAppend: string | null | undefined;
}

export const writeNextResponse = async ({
  listId,
  dataClient,
  stream,
  listsItemsIndex,
  searchAfter,
  stringToAppend,
}: WriteNextResponseOptions): Promise<string[] | undefined> => {
  const response = await getResponse({
    dataClient,
    searchAfter,
    listId,
    listsItemsIndex,
  });

  if (response.hits.hits.length) {
    writeResponseHitsToStream({ response, stream, stringToAppend });
    return getSearchAfterFromResponse({ response });
  } else {
    return undefined;
  }
};

export const getSearchAfterFromResponse = <T>({
  response,
}: {
  response: SearchResponse<T>;
}): string[] | undefined => {
  return response.hits.hits[response.hits.hits.length - 1].sort;
};

interface GetResponseOptions {
  dataClient: DataClient;
  listId: string;
  searchAfter: undefined | string[];
  listsItemsIndex: string;
  size?: number;
}

export const getResponse = async ({
  dataClient,
  searchAfter,
  listId,
  listsItemsIndex,
  size = SIZE,
}: GetResponseOptions): Promise<SearchResponse<ElasticListItemReturnType>> => {
  return dataClient.callAsCurrentUser('search', {
    index: listsItemsIndex,
    ignoreUnavailable: true,
    body: {
      query: {
        term: {
          list_id: listId,
        },
      },
      sort: [{ tie_breaker_id: 'asc' }],
      search_after: searchAfter,
    },
    size,
  });
};

interface WriteResponseHitsToStreamOptions {
  response: SearchResponse<ElasticListItemReturnType>;
  stream: PassThrough;
  stringToAppend: string | null | undefined;
}

export const writeResponseHitsToStream = ({
  response,
  stream,
  stringToAppend,
}: WriteResponseHitsToStreamOptions): void => {
  response.hits.hits.forEach(hit => {
    if (hit._source.ip != null) {
      stream.push(hit._source.ip);
    } else if (hit._source.keyword != null) {
      stream.push(hit._source.keyword);
    } else {
      // this is an error
      // TODO: Should we do something here?
    }
    if (stringToAppend != null) {
      stream.push(stringToAppend);
    }
  });
};
