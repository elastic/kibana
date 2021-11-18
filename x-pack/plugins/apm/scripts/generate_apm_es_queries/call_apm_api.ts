/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import type { formatRequest as formatRequestType } from '@kbn/server-route-repository';
// @ts-expect-error cannot find module or correspondent type declarations
// The code and types are at separated folders on @kbn/server-route-repository
// so in order to do targeted imports they must me imported separately, and
// an error is expected here
import { formatRequest } from '@kbn/server-route-repository/target_node/format_request';
import type { APIClientRequestParamsOf } from '../../public/services/rest/createCallApmApi';
import { InspectResponse } from '../../../observability/typings/common';
import type {
  APIEndpoint,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../server';

type ClientRequest<TEndpoint extends APIEndpoint = APIEndpoint> = {
  endpoint: TEndpoint;
} & APIClientRequestParamsOf<TEndpoint>;

export async function callApmApi<TEndpoint extends APIEndpoint>(
  req: ClientRequest<TEndpoint>
) {
  const { endpoint, params } = req as {
    endpoint: string;
    params?: {
      path?: Record<string, string>;
      body?: unknown;
      query?: Record<string, any>;
    };
  };

  const { method, pathname } = formatRequest(
    endpoint,
    params?.path
  ) as ReturnType<typeof formatRequestType>;

  try {
    const res = await axios.request({
      method,
      url: pathname,
      params: { ...params?.query, _inspect: true },
      data: params?.body,
      headers: {
        ['kbn-xsrf']: 'foo',
      },
    });

    const inspectResponse = res.data._inspect as InspectResponse;
    return inspectResponse.map((esQuery) => {
      return {
        endpoint,
        name: esQuery.name,
        request: esQuery.json,
        // response: esQuery.response?.json,
      };
    });
  } catch (e) {
    if (!e.isAxiosError) {
      throw e;
    }

    const { message, statusCode } = e.response.data;
    return { endpoint, errorMessage: message, statusCode };
  }
}
