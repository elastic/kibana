/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { first } from 'lodash';
import { schema } from '@kbn/config-schema';
import { InfraBackendLibs } from '../lib/infra_types';

interface HostDoc {
  _source: {
    host: {
      name: string;
    };
  };
}

const ipToHostSchema = schema.object({
  ip: schema.string(),
  index_pattern: schema.string(),
});

export const initIpToHostName = ({ framework }: InfraBackendLibs) => {
  const { callWithRequest } = framework;
  framework.registerRoute(
    {
      method: 'post',
      path: '/api/infra/ip_to_host',
      validate: {
        body: ipToHostSchema,
      },
    },
    async (requestContext, { body }, response) => {
      try {
        const params = {
          index: body.index_pattern,
          body: {
            size: 1,
            query: {
              match: { 'host.ip': body.ip },
            },
            _source: ['host.name'],
          },
        };
        const { hits } = await callWithRequest<HostDoc>(requestContext, 'search', params);
        if (hits.total.value === 0) {
          return response.notFound({
            body: { message: 'Host with matching IP address not found.' },
          });
        }
        const hostDoc = first(hits.hits) as any;
        return response.ok({ body: { host: hostDoc._source.host.name } });
      } catch ({ statusCode = 500, message = 'Unknown error occurred' }) {
        return response.customError({
          statusCode,
          body: { message },
        });
      }
    }
  );
};
