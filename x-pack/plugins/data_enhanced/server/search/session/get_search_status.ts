/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ApiResponse } from '@elastic/elasticsearch';
import { ElasticsearchClient } from 'src/core/server';
import { SearchStatus } from './types';
import { SearchSessionRequestInfo } from '../../../../../../src/plugins/data/common';
import { AsyncSearchStatusResponse } from '../../../../../../src/plugins/data/server';

export async function getSearchStatus(
  client: ElasticsearchClient,
  asyncId: string
): Promise<Pick<SearchSessionRequestInfo, 'status' | 'error'>> {
  // TODO: Handle strategies other than the default one
  try {
    // @ts-expect-error @elastic/elasticsearch status method is not defined
    const apiResponse: ApiResponse<AsyncSearchStatusResponse> = await client.asyncSearch.status({
      id: asyncId,
    });
    const response = apiResponse.body;
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
        error: undefined,
      };
    } else {
      return {
        status: SearchStatus.IN_PROGRESS,
        error: undefined,
      };
    }
  } catch (e) {
    return {
      status: SearchStatus.ERROR,
      error: i18n.translate('xpack.data.search.statusThrow', {
        defaultMessage: `Search status threw an error {message} ({errorCode}) status`,
        values: {
          message: e.message,
          errorCode: e.statusCode || 500,
        },
      }),
    };
  }
}
