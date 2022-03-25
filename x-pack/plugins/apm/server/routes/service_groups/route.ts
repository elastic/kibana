/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { kueryRt, rangeRt } from '../default_api_types';
import { getServiceGroups } from '../service_groups/get_service_groups';
import { getServiceGroup } from '../service_groups/get_service_group';
import { saveServiceGroup } from '../service_groups/save_service_group';
import { deleteServiceGroup } from '../service_groups/delete_service_group';
import { lookupServices } from '../service_groups/lookup_services';
import {
  ServiceGroup,
  SavedServiceGroup,
} from '../../../common/service_groups';

const serviceGroupsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/service-groups',
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{ serviceGroups: SavedServiceGroup[] }> => {
    const { context } = resources;
    const savedObjectsClient = context.core.savedObjects.client;
    const serviceGroups = await getServiceGroups({ savedObjectsClient });
    return { serviceGroups };
  },
});

const serviceGroupRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/service-group',
  params: t.type({
    query: t.type({
      serviceGroup: t.string,
    }),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources): Promise<{ serviceGroup: SavedServiceGroup }> => {
    const { context, params } = resources;
    const savedObjectsClient = context.core.savedObjects.client;
    const serviceGroup = await getServiceGroup({
      savedObjectsClient,
      serviceGroupId: params.query.serviceGroup,
    });
    return { serviceGroup };
  },
});

const serviceGroupSaveRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/service-group',
  params: t.type({
    query: t.intersection([
      rangeRt,
      t.partial({
        serviceGroupId: t.string,
      }),
    ]),
    body: t.type({
      groupName: t.string,
      kuery: t.string,
      description: t.union([t.string, t.undefined]),
      color: t.union([t.string, t.undefined]),
    }),
  }),
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (resources): Promise<void> => {
    const { context, params } = resources;
    const { start, end, serviceGroupId } = params.query;
    const savedObjectsClient = context.core.savedObjects.client;
    const setup = await setupRequest(resources);
    const items = await lookupServices({
      setup,
      kuery: params.body.kuery,
      start,
      end,
    });
    const serviceNames = items.map(({ serviceName }): string => serviceName);
    const serviceGroup: ServiceGroup = {
      ...params.body,
      serviceNames,
    };
    await saveServiceGroup({
      savedObjectsClient,
      serviceGroupId,
      serviceGroup,
    });
  },
});

const serviceGroupDeleteRoute = createApmServerRoute({
  endpoint: 'DELETE /internal/apm/service-group',
  params: t.type({
    query: t.type({
      serviceGroupId: t.string,
    }),
  }),
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (resources): Promise<void> => {
    const { context, params } = resources;
    const { serviceGroupId } = params.query;
    const savedObjectsClient = context.core.savedObjects.client;
    await deleteServiceGroup({
      savedObjectsClient,
      serviceGroupId,
    });
  },
});

const serviceGroupServicesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/service-group/services',
  params: t.type({
    query: t.intersection([rangeRt, t.partial(kueryRt.props)]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{ items: Awaited<ReturnType<typeof lookupServices>> }> => {
    const { params } = resources;
    const { kuery = '', start, end } = params.query;
    const setup = await setupRequest(resources);
    const items = await lookupServices({
      setup,
      kuery,
      start,
      end,
    });
    return { items };
  },
});

export const serviceGroupRouteRepository = {
  ...serviceGroupsRoute,
  ...serviceGroupRoute,
  ...serviceGroupSaveRoute,
  ...serviceGroupDeleteRoute,
  ...serviceGroupServicesRoute,
};
