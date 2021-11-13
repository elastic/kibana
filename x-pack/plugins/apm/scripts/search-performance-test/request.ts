/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';
import { tail } from 'lodash';
import type { formatRequest as formatRequestType } from '@kbn/server-route-repository';
// @ts-expect-error cannot find module or correspondent type declarations
// The code and types are at separated folders on @kbn/server-route-repository
// so in order to do targeted imports they must me imported separately, and
// an error is expected here
import { formatRequest } from '@kbn/server-route-repository/target_node/format_request';
import type {
  APIClientRequestParamsOf,
  APIReturnType,
} from '../../public/services/rest/createCallApmApi';
import type {
  APIEndpoint,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { withApmSpan } from '../../server/utils/with_apm_span';

type ClientRequest<TEndpoint extends APIEndpoint = APIEndpoint> = {
  endpoint: TEndpoint;
} & APIClientRequestParamsOf<TEndpoint>;

export function request<TEndpoint extends APIEndpoint>(
  req: ClientRequest<TEndpoint>
): Promise<APIReturnType<TEndpoint>> {
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

  return withApmSpan(endpoint, () =>
    axios
      .request({
        method,
        url: tail(pathname.split('/').filter(Boolean)).join('/'),
        params: params?.query,
        data: params?.body,
      })
      .then((res) => {
        return res.data as APIReturnType<TEndpoint>;
      })
  );
}
