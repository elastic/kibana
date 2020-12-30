/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { pick } from 'lodash';
import { INVALID_LICENSE } from '../../../common/custom_link';
import { ILicense } from '../../../../licensing/common/types';
import { FILTER_OPTIONS } from '../../../common/custom_link/custom_link_filter_options';
import { notifyFeatureUsage } from '../../feature';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createOrUpdateCustomLink } from '../../lib/settings/custom_link/create_or_update_custom_link';
import {
  filterOptionsRt,
  payloadRt,
} from '../../lib/settings/custom_link/custom_link_types';
import { deleteCustomLink } from '../../lib/settings/custom_link/delete_custom_link';
import { getTransaction } from '../../lib/settings/custom_link/get_transaction';
import { listCustomLinks } from '../../lib/settings/custom_link/list_custom_links';
import { createRoute } from '../create_route';

function isActiveGoldLicense(license: ILicense) {
  return license.isActive && license.hasAtLeast('gold');
}

export const customLinkTransactionRoute = createRoute({
  endpoint: 'GET /api/apm/settings/custom_links/transaction',
  options: { tags: ['access:apm'] },
  params: t.partial({
    query: filterOptionsRt,
  }),
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { query } = context.params;
    // picks only the items listed in FILTER_OPTIONS
    const filters = pick(query, FILTER_OPTIONS);
    return await getTransaction({ setup, filters });
  },
});

export const listCustomLinksRoute = createRoute({
  endpoint: 'GET /api/apm/settings/custom_links',
  options: { tags: ['access:apm'] },
  params: t.partial({
    query: filterOptionsRt,
  }),
  handler: async ({ context, request }) => {
    if (!isActiveGoldLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }
    const setup = await setupRequest(context, request);
    const { query } = context.params;
    // picks only the items listed in FILTER_OPTIONS
    const filters = pick(query, FILTER_OPTIONS);
    return await listCustomLinks({ setup, filters });
  },
});

export const createCustomLinkRoute = createRoute({
  endpoint: 'POST /api/apm/settings/custom_links',
  params: t.type({
    body: payloadRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    if (!isActiveGoldLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }
    const setup = await setupRequest(context, request);
    const customLink = context.params.body;
    const res = await createOrUpdateCustomLink({ customLink, setup });

    notifyFeatureUsage({
      licensingPlugin: context.licensing,
      featureName: 'customLinks',
    });
    return res;
  },
});

export const updateCustomLinkRoute = createRoute({
  endpoint: 'PUT /api/apm/settings/custom_links/{id}',
  params: t.type({
    path: t.type({
      id: t.string,
    }),
    body: payloadRt,
  }),
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  handler: async ({ context, request }) => {
    if (!isActiveGoldLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }
    const setup = await setupRequest(context, request);
    const { id } = context.params.path;
    const customLink = context.params.body;
    const res = await createOrUpdateCustomLink({
      customLinkId: id,
      customLink,
      setup,
    });
    return res;
  },
});

export const deleteCustomLinkRoute = createRoute({
  endpoint: 'DELETE /api/apm/settings/custom_links/{id}',
  params: t.type({
    path: t.type({
      id: t.string,
    }),
  }),
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  handler: async ({ context, request }) => {
    if (!isActiveGoldLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }
    const setup = await setupRequest(context, request);
    const { id } = context.params.path;
    const res = await deleteCustomLink({
      customLinkId: id,
      setup,
    });
    return res;
  },
});
