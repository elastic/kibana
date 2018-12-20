/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { BeatsTagAssignment } from '../../../public/lib/adapters/beats/adapter_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';
import { wrapEsError } from '../../utils/error_wrappers';

// TODO: write to Kibana audit log file https://github.com/elastic/kibana/issues/26024
export const createTagAssignmentsRoute = (libs: CMServerLibs) => ({
  method: 'POST',
  path: '/api/beats/agents_tags/assignments',
  licenseRequired: REQUIRED_LICENSES,
  requiredRoles: ['beats_admin'],
  config: {
    validate: {
      payload: Joi.object({
        assignments: Joi.array().items(
          Joi.object({
            beatId: Joi.string().required(),
            tag: Joi.string().required(),
          })
        ),
      }).required(),
    },
  },
  handler: async (request: FrameworkRequest) => {
    const { assignments }: { assignments: BeatsTagAssignment[] } = request.payload;

    try {
      const response = await libs.beats.assignTagsToBeats(request.user, assignments);
      return response;
    } catch (err) {
      // TODO move this to kibana route thing in adapter
      return wrapEsError(err);
    }
  },
});
