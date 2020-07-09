/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PassThrough } from 'stream';

import { SearchResponse } from 'elasticsearch';
import { LegacyAPICaller } from 'kibana/server';

import { SearchEsListItemSchema } from '../../../common/schemas';
import { ErrorWithStatusCode } from '../../error_with_status_code';
import { findSourceValue } from '../utils/find_source_value';

/**
 * How many results to page through from the network at a time
 * using search_after
 */
export const SIZE = 100;

export interface ExportListItemsToStreamOptions {
  listId: string;
  callCluster: LegacyAPICaller;
  listItemIndex: string;
  stream: PassThrough;
  stringToAppend: string | null | undefined;
}

export const exportListItemsToStream = ({
  listId,
  callCluster,
  stream,
  listItemIndex,
  stringToAppend,
}: ExportListItemsToStreamOptions): void => {
  // Use a timeout to start the reading process on the next tick.
  // and prevent the async await from bubbling up to the caller
  setTimeout(async () => {
    let searchAfter = await writeNextResponse({
      callCluster,
      listId,
      listItemIndex,
      searchAfter: undefined,
      stream,
      stringToAppend,
    });
    while (searchAfter != null) {
      searchAfter = await writeNextResponse({
        callCluster,
        listId,
        listItemIndex,
        searchAfter,
        stream,
        stringToAppend,
      });
    }
    stream.end();
  });
};

export interface WriteNextResponseOptions {
  listId: string;
  callCluster: LegacyAPICaller;
  listItemIndex: string;
  stream: PassThrough;
  searchAfter: string[] | undefined;
  stringToAppend: string | null | undefined;
}

export const writeNextResponse = async ({
  listId,
  callCluster,
  stream,
  listItemIndex,
  searchAfter,
  stringToAppend,
}: WriteNextResponseOptions): Promise<string[] | undefined> => {
  const response = await getResponse({
    callCluster,
    listId,
    listItemIndex,
    searchAfter,
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
}): string[] | undefined =>
  response.hits.hits.length > 0
    ? response.hits.hits[response.hits.hits.length - 1].sort
    : undefined;

export interface GetResponseOptions {
  callCluster: LegacyAPICaller;
  listId: string;
  searchAfter: undefined | string[];
  listItemIndex: string;
  size?: number;
}

export const getResponse = async ({
  callCluster,
  searchAfter,
  listId,
  listItemIndex,
  size = SIZE,
}: GetResponseOptions): Promise<SearchResponse<SearchEsListItemSchema>> => {
  return callCluster<SearchEsListItemSchema>('search', {
    body: {
      query: {
        term: {
          list_id: listId,
        },
      },
      search_after: searchAfter,
      sort: [{ tie_breaker_id: 'asc' }],
    },
    ignoreUnavailable: true,
    index: listItemIndex,
    size,
  });
};

export interface WriteResponseHitsToStreamOptions {
  response: SearchResponse<SearchEsListItemSchema>;
  stream: PassThrough;
  stringToAppend: string | null | undefined;
}

export const writeResponseHitsToStream = ({
  response,
  stream,
  stringToAppend,
}: WriteResponseHitsToStreamOptions): void => {
  const stringToAppendOrEmpty = stringToAppend ?? '';

  response.hits.hits.forEach((hit) => {
    const value = findSourceValue(hit._source);
    if (value != null) {
      stream.push(`${value}${stringToAppendOrEmpty}`);
    } else {
      throw new ErrorWithStatusCode(
        `Encountered an error where hit._source was an unexpected type: ${JSON.stringify(
          hit._source
        )}`,
        400
      );
    }
  });
};
