/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { TAGS_API_PATH } from '../../../common/constants';
import { assertTagsContext } from './util/assert_tags_context';
import { RouteParams } from '../types';

export const findResources = ({ router }: RouteParams) => {
  router.post(
    {
      path: `${TAGS_API_PATH}/find_resources`,
      validate: {
        body: schema.object({
          tagIds: schema.arrayOf(schema.string()),
          kidPrefix: schema.string(),
          perPage: schema.number(),
          page: schema.number(),
        }),
      },
    },
    assertTagsContext(async ({ tags }, req, res) => {
      const body = await tags.attachmentsClient.findResources(req.body);
      return res.ok({ body });
    })
  );
};
