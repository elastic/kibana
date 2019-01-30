/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { CMServerLibs } from '../../lib/types';
import { wrapEsError } from '../../utils/error_wrappers';
import { FrameworkRouteOptions } from './../../lib/adapters/framework/adapter_types';

export const createGetConfigurationBlocksRoute = (libs: CMServerLibs): FrameworkRouteOptions => ({
  method: 'GET',
  path: '/api/beats/configurations/{tagIds}/{page?}',
  requiredRoles: ['beats_admin'],
  licenseRequired: REQUIRED_LICENSES,
  handler: async (request: any) => {
    const tagIdString: string = request.params.tagIds;
    const tagIds = tagIdString.split(',').filter((id: string) => id.length > 0);

    let tags;
    try {
      tags = await libs.configurationBlocks.getForTags(
        request.user,
        tagIds,
        parseInt(request.params.page, 10),
        5
      );
    } catch (err) {
      return wrapEsError(err);
    }

    return tags;
  },
});
