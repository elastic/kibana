/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BeatTag } from '../../../common/domain_types';
import { CMServerLibs } from '../../lib/lib';
import { wrapEsError } from '../../utils/error_wrappers';

export const createGetTagsWithIdsRoute = (libs: CMServerLibs) => ({
  method: 'GET',
  path: '/api/beats/tags/{tagIds}',
  requiredRoles: ['beats_admin'],
  licenseRequired: true,
  handler: async (request: any, reply: any) => {
    const tagIdString: string = request.params.tagIds;
    const tagIds = tagIdString.split(',').filter((id: string) => id.length > 0);

    let tags: BeatTag[];
    try {
      tags = await libs.tags.getTagsWithIds(request.user, tagIds);
    } catch (err) {
      return reply(wrapEsError(err));
    }

    reply(tags);
  },
});
