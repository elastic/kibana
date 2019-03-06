/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { ReturnTypeBulkAction } from '../../../common/return_types';
import { BeatsTagAssignment } from '../../../public/lib/adapters/beats/adapter_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';

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
  handler: async (request: FrameworkRequest): Promise<ReturnTypeBulkAction> => {
    const { assignments }: { assignments: BeatsTagAssignment[] } = request.payload;

    const response = await libs.beats.assignTagsToBeats(request.user, assignments);

    return {
      success: true,
      results: response.assignments.map(assignment => ({
        success: assignment.status && assignment.status >= 200 && assignment.status < 300,
        error:
          !assignment.status || assignment.status >= 300
            ? {
                code: assignment.status || 400,
                message: assignment.result,
              }
            : undefined,
        result:
          assignment.status && assignment.status >= 200 && assignment.status < 300
            ? {
                message: assignment.result,
              }
            : undefined,
      })),
    } as ReturnTypeBulkAction;
  },
});
