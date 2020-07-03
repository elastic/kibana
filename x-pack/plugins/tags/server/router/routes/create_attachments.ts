/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { TAGS_API_PATH } from '../../../common/constants';
import { assertTagsContext } from './util/assert_tags_context';
import { handleBoomErrors } from './util/handle_boom_errors';
import { RouteParams } from '../types';

export const createAttachments = ({ router }: RouteParams) => {
  router.post(
    {
      path: `${TAGS_API_PATH}/attachment`,
      validate: {
        body: schema.object({
          attachments: schema.arrayOf(
            schema.object({
              tagId: schema.string(),
              kid: schema.string(),
            })
          ),
        }),
      },
    },
    handleBoomErrors(
      assertTagsContext(async ({ tags }, req, res) => {
        const body = await tags.attachmentsClient.create(req.body);
        return res.ok({ body });
      })
    )
  );
};
