/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler, RequestHandlerContext } from 'kibana/server';
import {
  DeleteTrustedAppsRequestParams,
  GetTrustedAppsListRequest,
  GetTrustedListAppsResponse,
  PostTrustedAppCreateRequest,
} from '../../../../common/endpoint/types';
import { EndpointAppContext } from '../../types';
import { exceptionItemToTrustedAppItem, newTrustedAppItemToExceptionItem } from './utils';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../../../../lists/common/constants';
import { ExceptionListClient } from '../../../../../lists/server';

const exceptionListClientFromContext = (context: RequestHandlerContext): ExceptionListClient => {
  const exceptionLists = context.lists?.getExceptionListClient();

  if (!exceptionLists) {
    throw new Error('Exception List client not found');
  }

  return exceptionLists;
};

export const getTrustedAppsDeleteRouteHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<DeleteTrustedAppsRequestParams, undefined, undefined> => {
  const logger = endpointAppContext.logFactory.get('trusted_apps');

  return async (context, req, res) => {
    try {
      const exceptionsListService = exceptionListClientFromContext(context);
      const { id } = req.params;
      const response = await exceptionsListService.deleteExceptionListItem({
        id,
        itemId: undefined,
        namespaceType: 'agnostic',
      });

      if (response === null) {
        return res.notFound({ body: `trusted app id [${id}] not found` });
      }

      return res.ok();
    } catch (error) {
      logger.error(error);
      return res.internalError({ body: error });
    }
  };
};

export const getTrustedAppsListRouteHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<undefined, GetTrustedAppsListRequest> => {
  const logger = endpointAppContext.logFactory.get('trusted_apps');

  return async (context, req, res) => {
    const { page, per_page: perPage } = req.query;

    try {
      const exceptionsListService = exceptionListClientFromContext(context);
      // Ensure list is created if it does not exist
      await exceptionsListService.createTrustedAppsList();
      const results = await exceptionsListService.findExceptionListItem({
        listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
        page,
        perPage,
        filter: undefined,
        namespaceType: 'agnostic',
        sortField: 'name',
        sortOrder: 'asc',
      });
      const body: GetTrustedListAppsResponse = {
        data: results?.data.map(exceptionItemToTrustedAppItem) ?? [],
        total: results?.total ?? 0,
        page: results?.page ?? 1,
        per_page: results?.per_page ?? perPage!,
      };
      return res.ok({ body });
    } catch (error) {
      logger.error(error);
      return res.internalError({ body: error });
    }
  };
};

export const getTrustedAppsCreateRouteHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<undefined, undefined, PostTrustedAppCreateRequest> => {
  const logger = endpointAppContext.logFactory.get('trusted_apps');

  return async (context, req, res) => {
    const newTrustedApp = req.body;

    try {
      const exceptionsListService = exceptionListClientFromContext(context);
      // Ensure list is created if it does not exist
      await exceptionsListService.createTrustedAppsList();

      const createdTrustedAppExceptionItem = await exceptionsListService.createExceptionListItem(
        newTrustedAppItemToExceptionItem(newTrustedApp)
      );

      return res.ok({
        body: {
          data: exceptionItemToTrustedAppItem(createdTrustedAppExceptionItem),
        },
      });
    } catch (error) {
      logger.error(error);
      return res.internalError({ body: error });
    }
  };
};
