/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import Boom from 'boom';
import { uniq } from 'lodash';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceAgentName } from '../lib/services/get_service_agent_name';
import { getServices } from '../lib/services/get_services';
import { getServiceTransactionTypes } from '../lib/services/get_service_transaction_types';
import { getServiceNodeMetadata } from '../lib/services/get_service_node_metadata';
import { createRoute } from './create_route';
import { uiFiltersRt, rangeRt } from './default_api_types';
import { getServiceAnnotations } from '../lib/services/annotations';
import { dateAsStringRt } from '../../common/runtime_types/date_as_string_rt';

export const servicesRoute = createRoute(() => ({
  path: '/api/apm/services',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const services = await getServices(setup);

    return services;
  },
}));

export const serviceAgentNameRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/agent_name',
  params: {
    path: t.type({
      serviceName: t.string,
    }),
    query: rangeRt,
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    return getServiceAgentName(serviceName, setup);
  },
}));

export const serviceTransactionTypesRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/transaction_types',
  params: {
    path: t.type({
      serviceName: t.string,
    }),
    query: rangeRt,
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    return getServiceTransactionTypes(serviceName, setup);
  },
}));

export const serviceNodeMetadataRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
  params: {
    path: t.type({
      serviceName: t.string,
      serviceNodeName: t.string,
    }),
    query: t.intersection([uiFiltersRt, rangeRt]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName, serviceNodeName } = context.params.path;
    return getServiceNodeMetadata({ setup, serviceName, serviceNodeName });
  },
}));

export const serviceAnnotationsRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/annotation/search',
  params: {
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      rangeRt,
      t.partial({
        environment: t.string,
      }),
    ]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { environment } = context.params.query;

    const annotationsClient = await context.plugins.observability?.getScopedAnnotationsClient(
      context,
      request
    );

    return getServiceAnnotations({
      setup,
      serviceName,
      environment,
      annotationsClient,
      apiCaller: context.core.elasticsearch.legacy.client.callAsCurrentUser,
      logger: context.logger,
    });
  },
}));

export const serviceAnnotationsCreateRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/annotation',
  method: 'POST',
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  params: {
    path: t.type({
      serviceName: t.string,
    }),
    body: t.intersection([
      t.type({
        '@timestamp': dateAsStringRt,
        service: t.intersection([
          t.type({
            version: t.string,
          }),
          t.partial({
            environment: t.string,
          }),
        ]),
      }),
      t.partial({
        message: t.string,
        tags: t.array(t.string),
      }),
    ]),
  },
  handler: async ({ request, context }) => {
    const annotationsClient = await context.plugins.observability?.getScopedAnnotationsClient(
      context,
      request
    );

    if (!annotationsClient) {
      throw Boom.notFound();
    }

    const { body, path } = context.params;

    return annotationsClient.create({
      message: body.service.version,
      ...body,
      annotation: {
        type: 'deployment',
      },
      service: {
        ...body.service,
        name: path.serviceName,
      },
      tags: uniq(['apm'].concat(body.tags ?? [])),
    });
  },
}));
