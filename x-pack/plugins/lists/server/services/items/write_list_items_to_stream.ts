/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from 'kibana/server';

import { ErrorWithStatusCode } from '../../error_with_status_code';
import { findSourceValue } from '../utils/find_source_value';
import { SearchEsListItemSchema } from '../../schemas/elastic_response';

/**
 * How many results to page through from the network at a time
 * using search_after
 */
export const SIZE = 100;

export interface ExportListItemsToStreamOptions {
  listId: string;
  esClient: ElasticsearchClient;
  listItemIndex: string;
  stream: PassThrough;
  stringToAppend: string | null | undefined;
}

export const exportListItemsToStream = ({
  listId,
  esClient,
  stream,
  listItemIndex,
  stringToAppend,
}: ExportListItemsToStreamOptions): void => {
  // Use a timeout to start the reading process on the next tick.
  // and prevent the async await from bubbling up to the caller
  setTimeout(async () => {
    let searchAfter = await writeNextResponse({
      esClient,
      listId,
      listItemIndex,
      searchAfter: undefined,
      stream,
      stringToAppend,
    });
    while (searchAfter != null) {
      searchAfter = await writeNextResponse({
        esClient,
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
  esClient: ElasticsearchClient;
  listItemIndex: string;
  stream: PassThrough;
  searchAfter: string[] | undefined;
  stringToAppend: string | null | undefined;
}

export const writeNextResponse = async ({
  listId,
  esClient,
  stream,
  listItemIndex,
  searchAfter,
  stringToAppend,
}: WriteNextResponseOptions): Promise<string[] | undefined> => {
  const response = await getResponse({
    esClient,
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
  response: estypes.SearchResponse<T>;
}): string[] | undefined =>
  // @ts-expect-error @elastic/elasticsearch SortResults contains null
  response.hits.hits.length > 0
    ? response.hits.hits[response.hits.hits.length - 1].sort
    : undefined;

export interface GetResponseOptions {
  esClient: ElasticsearchClient;
  listId: string;
  searchAfter: undefined | string[];
  listItemIndex: string;
  size?: number;
}

export const getResponse = async ({
  esClient,
  searchAfter,
  listId,
  listItemIndex,
  size = SIZE,
}: GetResponseOptions): Promise<estypes.SearchResponse<SearchEsListItemSchema>> => {
  return (await esClient.search<SearchEsListItemSchema>({
    body: {
      query: {
        term: {
          list_id: listId,
        },
      },
      search_after: searchAfter,
      sort: [{ tie_breaker_id: 'asc' }],
    },
    ignore_unavailable: true,
    index: listItemIndex,
    size,
  })) as unknown as estypes.SearchResponse<SearchEsListItemSchema>;
};

export interface WriteResponseHitsToStreamOptions {
  response: estypes.SearchResponse<SearchEsListItemSchema>;
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
    // @ts-expect-error @elastic/elasticsearch _source is optional
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
