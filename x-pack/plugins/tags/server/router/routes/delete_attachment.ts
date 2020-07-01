/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { TAGS_API_PATH } from '../../../common/constants';
import { assertTagsContext } from './util/assert_tags_context';
import { RouteParams } from '../types';

export const deleteAttachment = ({ router }: RouteParams) => {
  router.delete(
    {
      path: `${TAGS_API_PATH}/tag/{tagId}/attachment/{kid}`,
      validate: {
        params: schema.object({
          tagId: schema.string(),
          kid: schema.string(),
        }),
      },
    },
    assertTagsContext(async ({ tags }, req, res) => {
      const { tagId, kid } = req.params;
      await tags.attachmentsClient.del({
        tagId,
        kid: Buffer.from(kid, 'base64').toString('utf8'),
      });
      return res.ok();
    })
  );
};
