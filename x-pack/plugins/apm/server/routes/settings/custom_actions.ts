/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { createRoute } from '../create_route';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createOrUpdateCustomAction } from '../../lib/settings/custom_action/create_or_update_custom_action';
import { deleteCustomAction } from '../../lib/settings/custom_action/delete_custom_action';
import { listCustomActions } from '../../lib/settings/custom_action/list_custom_actions';

export const listCustomActionsRoute = createRoute(core => ({
  path: '/api/apm/settings/custom-actions',
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    return await listCustomActions({ setup });
  }
}));

const payload = t.intersection([
  t.type({
    actionId: t.string,
    label: t.string,
    url: t.string
  }),
  t.partial({
    filters: t.record(t.string, t.string)
  })
]);

export const createCustomActionRoute = createRoute(() => ({
  method: 'POST',
  path: '/api/apm/settings/custom-actions',
  params: {
    body: payload
  },
  options: {
    tags: ['access:apm', 'access:apm_write']
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const customAction = context.params.body;
    const res = await createOrUpdateCustomAction({ customAction, setup });
    return res;
  }
}));

export const updateCustomActionRoute = createRoute(() => ({
  method: 'PUT',
  path: '/api/apm/settings/custom-actions/{id}',
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
    const customAction = context.params.body;
    const res = await createOrUpdateCustomAction({
      customActionId: id,
      customAction,
      setup
    });
    return res;
  }
}));

export const deleteCustomActionRoute = createRoute(() => ({
  method: 'DELETE',
  path: '/api/apm/settings/custom-actions/{id}',
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
    const res = await deleteCustomAction({
      customActionId: id,
      setup
    });
    return res;
  }
}));
