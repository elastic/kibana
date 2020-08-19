/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'kibana/server';
import {
  GetTrustedAppsListRequest,
  GetTrustedListAppsResponse,
} from '../../../../common/endpoint/types';
import { EndpointAppContext } from '../../types';
import { exceptionItemToTrustedAppItem } from './utils';

export const getTrustedAppsListRouteHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<undefined, GetTrustedAppsListRequest> => {
  const exceptionsListService = endpointAppContext.service.getExceptionsList();
  const logger = endpointAppContext.logFactory.get('trusted_apps');

  return async (context, req, res) => {
    const { page, per_page: perPage } = req.query;

    // FIXME:PT call create list once PR merges

    try {
      const results = await exceptionsListService?.findExceptionListItem({
        listId: 'trusted-apps', // FIXME:PT get value from const defined in pending PR
        page,
        perPage,
        filter: '',
        namespaceType: 'agnostic',
        sortField: 'name',
        sortOrder: 'asc',
      });
      const body: GetTrustedListAppsResponse = {
        data: results?.data.map(exceptionItemToTrustedAppItem) ?? [],
        total: results?.total ?? 0,
        page: results?.page ?? 1,
        per_page: perPage!,
      };
      return res.ok({ body });
    } catch (error) {
      logger.error(error);
      return res.internalError({ body: error });
    }
  };
};
