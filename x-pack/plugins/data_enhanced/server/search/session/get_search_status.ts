/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ApiResponse } from '@elastic/elasticsearch';
import { ElasticsearchClient } from 'src/core/server';
import { isAsyncSearchStatusResponse, SearchStatus } from './types';
import { AsyncSearchResponse } from '../types';

export interface SearchStatusInfo {
  status: SearchStatus;
  error?: string;
}

export async function getSearchStatus(
  client: ElasticsearchClient,
  asyncId: string
): Promise<SearchStatusInfo> {
  try {
    // TODO: Handle strategies other than KQL
    const response: ApiResponse<AsyncSearchResponse> = await client.asyncSearch.status({
      id: asyncId,
    });
    if (isAsyncSearchStatusResponse(response)) {
      if ((response.is_partial && !response.is_running) || response.completion_status >= 400) {
        return {
          status: SearchStatus.ERROR,
          error: i18n.translate('xpack.data.search.statusError', {
            defaultMessage: `Search completed with a {errorCode} status`,
            values: { errorCode: response.completion_status },
          }),
        };
      } else if (!response.is_partial && !response.is_running) {
        return {
          status: SearchStatus.COMPLETE,
        };
      } else {
        return {
          status: SearchStatus.IN_PROGRESS,
        };
      }
    } else {
      return {
        status: SearchStatus.ERROR,
        error: 'Unknown response format',
      };
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return {
      status: SearchStatus.ERROR,
      error: e.message,
    };
  }
}
