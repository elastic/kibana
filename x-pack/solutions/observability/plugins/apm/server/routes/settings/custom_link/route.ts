/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { pick } from 'lodash';
import {
  routeDefinitions,
  type ListCustomLinksResponse,
  type DeleteCustomLinkResponse,
  type CustomLinkTransactionResponse,
} from '@kbn/apm-api-shared';
import { FILTER_OPTIONS } from '@kbn/apm-types';
import { isActiveGoldLicense } from '../../../../common/license_check';
import { INVALID_LICENSE } from '../../../../common/custom_link';
import { notifyFeatureUsage } from '../../../feature';
import { createOrUpdateCustomLink } from './create_or_update_custom_link';
import { deleteCustomLink } from './delete_custom_link';
import { getTransaction } from './get_transaction';
import { listCustomLinks } from './list_custom_links';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { createInternalESClientWithResources } from '../../../lib/helpers/create_es_client/create_internal_es_client';

const customLinkTransactionRoute = createApmServerRoute({
  endpoint: routeDefinitions.customLinks.transaction.endpoint,
  params: routeDefinitions.customLinks.transaction.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<CustomLinkTransactionResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { query } = params;
    // picks only the items listed in FILTER_OPTIONS
    const filters = pick(query, FILTER_OPTIONS);
    return await getTransaction({ apmEventClient, filters });
  },
});

const listCustomLinksRoute = createApmServerRoute({
  endpoint: routeDefinitions.customLinks.list.endpoint,
  params: routeDefinitions.customLinks.list.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ListCustomLinksResponse> => {
    const { context, params } = resources;
    const licensingContext = await context.licensing;

    if (!isActiveGoldLicense(licensingContext.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const { query } = params;
    const internalESClient = await createInternalESClientWithResources(resources);

    // picks only the items listed in FILTER_OPTIONS
    const filters = pick(query, FILTER_OPTIONS);
    const customLinks = await listCustomLinks({
      internalESClient,
      filters,
    });
    return { customLinks };
  },
});

const createCustomLinkRoute = createApmServerRoute({
  endpoint: routeDefinitions.customLinks.create.endpoint,
  params: routeDefinitions.customLinks.create.params,
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_settings_write'],
    },
  },
  handler: async (resources): Promise<void> => {
    const { context, params } = resources;
    const licensingContext = await context.licensing;

    if (!isActiveGoldLicense(licensingContext.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const internalESClient = await createInternalESClientWithResources(resources);
    const customLink = params.body;

    notifyFeatureUsage({
      licensingPlugin: licensingContext,
      featureName: 'customLinks',
    });

    await createOrUpdateCustomLink({ customLink, internalESClient });
  },
});

const updateCustomLinkRoute = createApmServerRoute({
  endpoint: routeDefinitions.customLinks.update.endpoint,
  params: routeDefinitions.customLinks.update.params,
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_settings_write'],
    },
  },
  handler: async (resources): Promise<void> => {
    const { params, context } = resources;
    const licensingContext = await context.licensing;

    if (!isActiveGoldLicense(licensingContext.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const internalESClient = await createInternalESClientWithResources(resources);

    const { id } = params.path;
    const customLink = params.body;

    await createOrUpdateCustomLink({
      customLinkId: id,
      customLink,
      internalESClient,
    });
  },
});

const deleteCustomLinkRoute = createApmServerRoute({
  endpoint: routeDefinitions.customLinks.delete.endpoint,
  params: routeDefinitions.customLinks.delete.params,
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_settings_write'],
    },
  },
  handler: async (resources): Promise<DeleteCustomLinkResponse> => {
    const { context, params } = resources;
    const licensingContext = await context.licensing;

    if (!isActiveGoldLicense(licensingContext.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const internalESClient = await createInternalESClientWithResources(resources);
    const { id } = params.path;
    return deleteCustomLink({ customLinkId: id, internalESClient });
  },
});

export const customLinkRouteRepository = {
  ...customLinkTransactionRoute,
  ...listCustomLinksRoute,
  ...createCustomLinkRoute,
  ...updateCustomLinkRoute,
  ...deleteCustomLinkRoute,
};
