/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { TAGS_API_PATH } from '../../../common/constants';
import { assertTagsContext } from './util/assert_tags_context';
import { RouteParams } from '../types';
import { handleBoomErrors } from './util/handle_boom_errors';

export const readTag = ({ router }: RouteParams) => {
  router.get(
    {
      path: `${TAGS_API_PATH}/tag/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    handleBoomErrors(
      assertTagsContext(async ({ tags }, req, res) => {
        const body = await tags.tagsClient.read(req.params);
        return res.ok({ body });
      })
    )
  );
};
