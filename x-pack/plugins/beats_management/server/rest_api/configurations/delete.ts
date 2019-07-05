/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { CMServerLibs } from '../../lib/types';
import { wrapEsError } from '../../utils/error_wrappers';

export const createDeleteConfidurationsRoute = (libs: CMServerLibs) => ({
  method: 'DELETE',
  path: '/api/beats/configurations/{ids}',
  requiredRoles: ['beats_admin'],
  licenseRequired: REQUIRED_LICENSES,
  handler: async (request: any) => {
    const idString: string = request.params.ids;
    const ids = idString.split(',').filter((id: string) => id.length > 0);

    try {
      return await libs.configurationBlocks.delete(request.user, ids);
    } catch (err) {
      return wrapEsError(err);
    }
  },
});
