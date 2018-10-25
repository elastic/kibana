/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMServerLibs } from '../../lib/lib';
import { wrapEsError } from '../../utils/error_wrappers';

export const createDeleteTagsWithIdsRoute = (libs: CMServerLibs) => ({
  method: 'DELETE',
  path: '/api/beats/tags/{tagIds}',
  requiredRoles: ['beats_admin'],
  licenseRequired: true,
  handler: async (request: any, reply: any) => {
    const tagIdString: string = request.params.tagIds;
    const tagIds = tagIdString.split(',').filter((id: string) => id.length > 0);

    let success: boolean;
    try {
      success = await libs.tags.delete(request.user, tagIds);
    } catch (err) {
      return reply(wrapEsError(err));
    }

    reply({ success });
  },
});
