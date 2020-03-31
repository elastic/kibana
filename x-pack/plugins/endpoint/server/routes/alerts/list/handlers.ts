/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UpdateDocumentByQueryParams, UpdateDocumentByQueryResponse } from 'elasticsearch';
import { RequestHandler } from 'kibana/server';
import { EndpointAppContext } from '../../../types';
import { searchESForAlerts } from '../lib';
import { getRequestData, mapToAlertResultList } from './lib';
import {
  AlertingIndexGetQueryResult,
  AlertingIndexPatchBodyResult,
  AlertingIndexPatchQueryResult,
  EndpointAppConstants,
} from '../../../../common/types';

export const alertListGetHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<unknown, AlertingIndexGetQueryResult, unknown> {
  const alertListHandler: RequestHandler<unknown, AlertingIndexGetQueryResult, unknown> = async (
    ctx,
    req,
    res
  ) => {
    try {
      const reqData = await getRequestData(req, endpointAppContext);
      const response = await searchESForAlerts(ctx.core.elasticsearch.dataClient, reqData);
      const mappedBody = await mapToAlertResultList(ctx, endpointAppContext, reqData, response);
      return res.ok({ body: mappedBody });
    } catch (err) {
      return res.internalError({ body: err });
    }
  };

  return alertListHandler;
};

export const alertListUpdateHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<unknown, AlertingIndexPatchQueryResult, AlertingIndexPatchBodyResult> {
  const alertListHandler: RequestHandler<
    unknown,
    AlertingIndexPatchQueryResult,
    AlertingIndexPatchBodyResult
  > = async (ctx, req, res) => {
    try {
      // console.log(req.body);
      const reqWrapper: UpdateDocumentByQueryParams = {
        index: EndpointAppConstants.ALERT_INDEX_NAME,
        body: {
          query: {
            ids: {
              values: [],
            },
          },
          script: {
            source: `doc['state']['active'] = ${req.body.state.active}`,
            lang: 'painless',
          },
        },
      };
      for (const id of req.query.alert_ids) {
        reqWrapper.body.query.ids.values.push(id);
      }
      // console.log(JSON.stringify(reqWrapper));
      const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser(
        'updateByQuery',
        reqWrapper
      )) as UpdateDocumentByQueryResponse;
      // console.log(response);
      return res.ok({ body: response });
    } catch (err) {
      return res.internalError({ body: err });
    }
  };

  return alertListHandler;
};
