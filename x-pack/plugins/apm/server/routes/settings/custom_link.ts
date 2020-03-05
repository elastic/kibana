/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
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

const FilterOptions = t.partial({
  [SERVICE_NAME]: t.string,
  [SERVICE_ENVIRONMENT]: t.string,
  [TRANSACTION_NAME]: t.string,
  [TRANSACTION_TYPE]: t.string
});

export type FilterOptionsType = t.TypeOf<typeof FilterOptions>;

export const filterOptions: Array<keyof FilterOptionsType> = [
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_TYPE,
  TRANSACTION_NAME
];

export const listCustomLinksRoute = createRoute(core => ({
  path: '/api/apm/settings/custom-links',
  params: {
    query: FilterOptions
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { params } = context;
    return await listCustomLinks({ setup, filters: params.query });
  }
}));

const payload = t.intersection([
  t.type({
    label: t.string,
    url: t.string
  }),
  FilterOptions
]);

export const createCustomLinkRoute = createRoute(() => ({
  method: 'POST',
  path: '/api/apm/settings/custom-links',
  params: {
    body: payload
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
  path: '/api/apm/settings/custom-links/{id}',
  params: {
    path: t.type({
      id: t.string
    }),
    body: payload
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
  path: '/api/apm/settings/custom-links/{id}',
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
