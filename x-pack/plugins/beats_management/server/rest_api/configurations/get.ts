/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { ConfigurationBlock } from '../../../common/domain_types';
import { ReturnTypeList } from '../../../common/return_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';

export const createGetConfigurationBlocksRoute = (libs: CMServerLibs) => ({
  method: 'GET',
  path: '/api/beats/configurations/{tagIds}/{page?}',
  requiredRoles: ['beats_admin'],
  licenseRequired: REQUIRED_LICENSES,
  handler: async (request: FrameworkRequest): Promise<ReturnTypeList<ConfigurationBlock>> => {
    const tagIdString: string = request.params.tagIds;
    const tagIds = tagIdString.split(',').filter((id: string) => id.length > 0);

    const result = await libs.configurationBlocks.getForTags(
      request.user,
      tagIds,
      parseInt(request.params.page, 10),
      5
    );

    return { page: result.page, total: result.total, list: result.blocks, success: true };
  },
});
