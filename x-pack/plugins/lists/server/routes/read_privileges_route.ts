/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash/fp';

import type { ListsPluginRouter } from '../types';
import { LIST_PRIVILEGES_URL } from '../../common/constants';
import { buildSiemResponse, readPrivileges, transformError } from '../siem_server_deps';

import { getListClient } from './utils';

export const readPrivilegesRoute = (router: ListsPluginRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists-read'],
      },
      path: LIST_PRIVILEGES_URL,
      validate: false,
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const clusterClient = context.core.elasticsearch.legacy.client;
        const lists = getListClient(context);
        const clusterPrivilegesLists = await readPrivileges(
          clusterClient.callAsCurrentUser,
          lists.getListIndex()
        );
        const clusterPrivilegesListItems = await readPrivileges(
          clusterClient.callAsCurrentUser,
          lists.getListItemIndex()
        );
        const privileges = merge(
          {
            listItems: clusterPrivilegesListItems,
            lists: clusterPrivilegesLists,
          },
          {
            is_authenticated: request.auth.isAuthenticated ?? false,
          }
        );
        return response.ok({ body: privileges });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
