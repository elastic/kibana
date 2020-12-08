/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApiResponse } from '@elastic/elasticsearch';
import { ElasticsearchClient } from 'src/core/server';
import { isAsyncSearchStatusResponse, SearchStatus } from './types';

export async function getSearchStatus(client: ElasticsearchClient, asyncId: string) {
  try {
    const path = encodeURI(`/_async_search/status/${asyncId}`);
    const response: ApiResponse<any> = await client.transport.request({
      path,
      method: 'GET',
    });
    if (isAsyncSearchStatusResponse(response)) {
      if ((response.is_partial && !response.is_running) || response.completion_status > 200) {
        return SearchStatus.ERROR;
      } else if (!response.is_partial && !response.is_running) {
        return SearchStatus.COMPLETE;
      } else {
        return SearchStatus.IN_PROGRESS;
      }
    } else {
      return SearchStatus.ERROR;
    }
  } catch (e) {
    return SearchStatus.ERROR;
  }
}
