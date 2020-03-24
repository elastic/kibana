/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { pick } from 'lodash';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_NAME,
  TRANSACTION_TYPE
} from '../../../common/elasticsearch_fieldnames';
import { createRoute } from '../create_route';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createOrUpdateCustomLink } from '../../lib/settings/custom_link/create_or_update_custom_link';
import { deleteCustomLink } from '../../lib/settings/custom_link/delete_custom_link';
import { listCustomLinks } from '../../lib/settings/custom_link/list_custom_links';
import { getTransaction } from '../../lib/settings/custom_link/get_transaction';
import { FILTER_OPTIONS } from '../../../common/custom_link_filter_options';

export const FilterOptionsRt = t.partial({
  [SERVICE_NAME]: t.string,
  [SERVICE_ENVIRONMENT]: t.string,
  [TRANSACTION_NAME]: t.string,
  [TRANSACTION_TYPE]: t.string
});

export const customLinkTransactionRoute = createRoute(core => ({
  path: '/api/apm/settings/custom_links/transaction',
  params: {
    query: FilterOptionsRt
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { query } = context.params;
    // picks only the items listed in FILTER_OPTIONS
    const filters = pick(query, FILTER_OPTIONS);
    return await getTransaction({ setup, filters });
  }
}));

export const listCustomLinksRoute = createRoute(core => ({
  path: '/api/apm/settings/custom_links',
  params: {
    query: FilterOptionsRt
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { query } = context.params;
    // picks only the items listed in FILTER_OPTIONS
    const filters = pick(query, FILTER_OPTIONS);
    return await listCustomLinks({ setup, filters });
  }
}));

const Payload = t.intersection([
  t.type({
    label: t.string,
    url: t.string,
    filters: t.array(
      t.type({
        key: t.union([
          t.literal(SERVICE_NAME),
          t.literal(SERVICE_ENVIRONMENT),
          t.literal(TRANSACTION_TYPE),
          t.literal(TRANSACTION_NAME)
        ]),
        value: t.array(t.string)
      })
    )
  }),
  t.partial({ id: t.string })
]);

export const createCustomLinkRoute = createRoute(() => ({
  method: 'POST',
  path: '/api/apm/settings/custom_links',
  params: {
    body: Payload
  },
  options: {
    tags: ['access:apm', 'access:apm_write']
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const customLink = context.params.body;
    const res = await createOrUpdateCustomLink({ customLink, setup });
    return res;
  }
}));

export const updateCustomLinkRoute = createRoute(() => ({
  method: 'PUT',
  path: '/api/apm/settings/custom_links/{id}',
  params: {
    path: t.type({
      id: t.string
    }),
    body: Payload
  },
  options: {
    tags: ['access:apm', 'access:apm_write']
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { id } = context.params.path;
    const customLink = context.params.body;
    const res = await createOrUpdateCustomLink({
      customLinkId: id,
      customLink,
      setup
    });
    return res;
  }
}));

export const deleteCustomLinkRoute = createRoute(() => ({
  method: 'DELETE',
  path: '/api/apm/settings/custom_links/{id}',
  params: {
    path: t.type({
      id: t.string
    })
  },
  options: {
    tags: ['access:apm', 'access:apm_write']
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { id } = context.params.path;
    const res = await deleteCustomLink({
      customLinkId: id,
      setup
    });
    return res;
  }
}));
