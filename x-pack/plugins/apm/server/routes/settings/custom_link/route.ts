/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { pick } from 'lodash';
import { isActiveGoldLicense } from '../../../../common/license_check';
import { INVALID_LICENSE } from '../../../../common/custom_link';
import { FILTER_OPTIONS } from '../../../../common/custom_link/custom_link_filter_options';
import { notifyFeatureUsage } from '../../../feature';
import { setupRequest } from '../../../lib/helpers/setup_request';
import { createOrUpdateCustomLink } from './create_or_update_custom_link';
import { filterOptionsRt, payloadRt } from './custom_link_types';
import { deleteCustomLink } from './delete_custom_link';
import { getTransaction } from './get_transaction';
import { listCustomLinks } from './list_custom_links';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';

const customLinkTransactionRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/settings/custom_links/transaction',
  options: { tags: ['access:apm'] },
  params: t.partial({
    query: filterOptionsRt,
  }),
  handler: async (
    resources
  ): Promise<
    import('./../../../../typings/es_schemas/ui/transaction').Transaction
  > => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { query } = params;
    // picks only the items listed in FILTER_OPTIONS
    const filters = pick(query, FILTER_OPTIONS);
    return await getTransaction({ setup, filters });
  },
});

const listCustomLinksRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/settings/custom_links',
  options: { tags: ['access:apm'] },
  params: t.partial({
    query: filterOptionsRt,
  }),
  handler: async (
    resources
  ): Promise<{
    customLinks: Array<
      import('./../../../../common/custom_link/custom_link_types').CustomLink
    >;
  }> => {
    const { context, params } = resources;
    if (!isActiveGoldLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }
    const setup = await setupRequest(resources);

    const { query } = params;

    // picks only the items listed in FILTER_OPTIONS
    const filters = pick(query, FILTER_OPTIONS);
    const customLinks = await listCustomLinks({ setup, filters });
    return { customLinks };
  },
});

const createCustomLinkRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/settings/custom_links',
  params: t.type({
    body: payloadRt,
  }),
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (resources): Promise<void> => {
    const { context, params } = resources;
    if (!isActiveGoldLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }
    const setup = await setupRequest(resources);
    const customLink = params.body;

    notifyFeatureUsage({
      licensingPlugin: context.licensing,
      featureName: 'customLinks',
    });

    await createOrUpdateCustomLink({ customLink, setup });
  },
});

const updateCustomLinkRoute = createApmServerRoute({
  endpoint: 'PUT /internal/apm/settings/custom_links/{id}',
  params: t.type({
    path: t.type({
      id: t.string,
    }),
    body: payloadRt,
  }),
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  handler: async (resources): Promise<void> => {
    const { params, context } = resources;

    if (!isActiveGoldLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }
    const setup = await setupRequest(resources);

    const { id } = params.path;
    const customLink = params.body;

    await createOrUpdateCustomLink({
      customLinkId: id,
      customLink,
      setup,
    });
  },
});

const deleteCustomLinkRoute = createApmServerRoute({
  endpoint: 'DELETE /internal/apm/settings/custom_links/{id}',
  params: t.type({
    path: t.type({
      id: t.string,
    }),
  }),
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  handler: async (resources): Promise<{ result: string }> => {
    const { context, params } = resources;

    if (!isActiveGoldLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }
    const setup = await setupRequest(resources);
    const { id } = params.path;
    const res = await deleteCustomLink({
      customLinkId: id,
      setup,
    });
    return res;
  },
});

export const customLinkRouteRepository = {
  ...customLinkTransactionRoute,
  ...listCustomLinksRoute,
  ...createCustomLinkRoute,
  ...updateCustomLinkRoute,
  ...deleteCustomLinkRoute,
};
