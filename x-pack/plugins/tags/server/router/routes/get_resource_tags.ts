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

export const getResourceTags = ({ router }: RouteParams) => {
  router.get(
    {
      path: `${TAGS_API_PATH}/resource/{kid}/tags`,
      validate: {
        params: schema.object({
          kid: schema.string(),
        }),
      },
    },
    handleBoomErrors(
      assertTagsContext(async ({ tags }, req, res) => {
        const { kid } = req.params;
        const body = await tags.attachmentsClient.getAttachedTags({
          kid: Buffer.from(kid, 'base64').toString('utf8'),
        });
        return res.ok({ body });
      })
    )
  );
};
