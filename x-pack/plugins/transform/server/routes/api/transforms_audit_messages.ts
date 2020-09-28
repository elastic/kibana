/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { transformIdParamSchema, TransformIdParamSchema } from '../../../common/api_schemas/common';
import { AuditMessage, TransformMessage } from '../../../common/types/messages';

import { RouteDependencies } from '../../types';

import { addBasePath } from '../index';

import { wrapError, wrapEsError } from './error_utils';

const ML_DF_NOTIFICATION_INDEX_PATTERN = '.transform-notifications-read';
const SIZE = 500;

interface BoolQuery {
  bool: { [key: string]: any };
}

export function registerTransformsAuditMessagesRoutes({ router, license }: RouteDependencies) {
  /**
   * @apiGroup Transforms Audit Messages
   *
   * @api {get} /api/transform/transforms/:transformId/messages Transforms Messages
   * @apiName GetTransformsMessages
   * @apiDescription Get transforms audit messages
   *
   * @apiSchema (params) transformIdParamSchema
   */
  router.get<TransformIdParamSchema, undefined, undefined>(
    {
      path: addBasePath('transforms/{transformId}/messages'),
      validate: { params: transformIdParamSchema },
    },
    license.guardApiRoute<TransformIdParamSchema, undefined, undefined>(async (ctx, req, res) => {
      const { transformId } = req.params;

      // search for audit messages,
      // transformId is optional. without it, all transforms will be listed.
      const query: BoolQuery = {
        bool: {
          filter: [
            {
              bool: {
                must_not: {
                  term: {
                    level: 'activity',
                  },
                },
              },
            },
          ],
        },
      };

      // if no transformId specified, load all of the messages
      if (transformId !== undefined) {
        query.bool.filter.push({
          bool: {
            should: [
              {
                term: {
                  transform_id: '', // catch system messages
                },
              },
              {
                term: {
                  transform_id: transformId, // messages for specified transformId
                },
              },
            ],
          },
        });
      }

      try {
        const resp = await ctx.transform!.dataClient.callAsCurrentUser('search', {
          index: ML_DF_NOTIFICATION_INDEX_PATTERN,
          ignore_unavailable: true,
          rest_total_hits_as_int: true,
          size: SIZE,
          body: {
            sort: [{ timestamp: { order: 'desc' } }, { transform_id: { order: 'asc' } }],
            query,
          },
        });

        let messages: TransformMessage[] = [];
        if (resp.hits.total !== 0) {
          messages = resp.hits.hits.map((hit: AuditMessage) => hit._source);
          messages.reverse();
        }
        return res.ok({ body: messages });
      } catch (e) {
        return res.customError(wrapError(wrapEsError(e)));
      }
    })
  );
}
