/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { KibanaRequest, IKibanaResponse, KibanaResponseFactory } from 'kibana/server';
import { TAGS_API_PATH } from '../../constants';
import { assertTagsContext } from './util/assert_tags_context';
import { RouteParams } from '../types';

export const bodySchema = schema.object({
  name: schema.string(),
});

export const createRoute = ({ router }: RouteParams) => {
  router.post(
    {
      path: `${TAGS_API_PATH}`,
      validate: {
        body: bodySchema,
      },
    },
    assertTagsContext(
      async (
        context,
        req: KibanaRequest<unknown, unknown, TypeOf<typeof bodySchema>>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse> => {
        return res.ok({
          body: { foo: 'bar' },
        });
      }
    )
  );
};
