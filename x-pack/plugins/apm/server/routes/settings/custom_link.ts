/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { pick } from 'lodash';
import { FILTER_OPTIONS } from '../../../common/custom_link/custom_link_filter_options';
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

export const customLinkTransactionRoute = createRoute(() => ({
  path: '/api/apm/settings/custom_links/transaction',
  params: {
    query: filterOptionsRt,
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { query } = context.params;
    // picks only the items listed in FILTER_OPTIONS
    const filters = pick(query, FILTER_OPTIONS);
    return await getTransaction({ setup, filters });
  },
}));

export const listCustomLinksRoute = createRoute(() => ({
  path: '/api/apm/settings/custom_links',
  params: {
    query: filterOptionsRt,
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { query } = context.params;
    // picks only the items listed in FILTER_OPTIONS
    const filters = pick(query, FILTER_OPTIONS);
    return await listCustomLinks({ setup, filters });
  },
}));

export const createCustomLinkRoute = createRoute(() => ({
  method: 'POST',
  path: '/api/apm/settings/custom_links',
  params: {
    body: payloadRt,
  },
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const customLink = context.params.body;
    const res = await createOrUpdateCustomLink({ customLink, setup });
    return res;
  },
}));

export const updateCustomLinkRoute = createRoute(() => ({
  method: 'PUT',
  path: '/api/apm/settings/custom_links/{id}',
  params: {
    path: t.type({
      id: t.string,
    }),
    body: payloadRt,
  },
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  handler: async ({ context, request }) => {
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
}));

export const deleteCustomLinkRoute = createRoute(() => ({
  method: 'DELETE',
  path: '/api/apm/settings/custom_links/{id}',
  params: {
    path: t.type({
      id: t.string,
    }),
  },
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { id } = context.params.path;
    const res = await deleteCustomLink({
      customLinkId: id,
      setup,
    });
    return res;
  },
}));
