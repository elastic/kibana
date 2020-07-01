/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { TAGS_API_PATH } from '../../../common/constants';
import { assertTagsContext } from './util/assert_tags_context';
import { RouteParams } from '../types';

export const updateTag = ({ router }: RouteParams) => {
  router.post(
    {
      path: `${TAGS_API_PATH}/tag/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          patch: schema.object({
            title: schema.string(),
            description: schema.string(),
            color: schema.string(),
          }),
        }),
      },
    },
    assertTagsContext(async ({ tags }, req, res) => {
      const { id } = req.params;
      const body = await tags.tagsClient.update({ patch: { ...req.body.patch, id } });
      return res.ok({ body });
    })
  );
};
