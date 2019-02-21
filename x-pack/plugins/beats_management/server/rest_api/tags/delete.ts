/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { ReturnTypeBulkDelete } from '../../../common/return_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';

export const createDeleteTagsWithIdsRoute = (libs: CMServerLibs) => ({
  method: 'DELETE',
  path: '/api/beats/tags/{tagIds}',
  requiredRoles: ['beats_admin'],
  licenseRequired: REQUIRED_LICENSES,
  handler: async (request: FrameworkRequest): Promise<ReturnTypeBulkDelete> => {
    const tagIdString: string = request.params.tagIds;
    const tagIds = tagIdString.split(',').filter((id: string) => id.length > 0);

    let success: boolean;
    success = await libs.tags.delete(request.user, tagIds);

    return {
      results: tagIds.map(() => ({
        success,
        action: 'deleted',
      })),
      success,
    } as ReturnTypeBulkDelete;
  },
});
