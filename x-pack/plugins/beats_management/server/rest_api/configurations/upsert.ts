/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { REQUIRED_LICENSES } from '../../../common/constants';
import {
  ConfigurationBlock,
  createConfigurationBlockInterface,
} from '../../../common/domain_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';

// TODO: write to Kibana audit log file
export const upsertConfigurationRoute = (libs: CMServerLibs) => ({
  method: 'PUT',
  path: '/api/beats/configurations',
  licenseRequired: REQUIRED_LICENSES,
  requiredRoles: ['beats_admin'],
  config: {
    validate: {
      payload: Joi.array().items(Joi.object({}).unknown(true)),
    },
  },
  handler: async (request: FrameworkRequest) => {
    const result = request.payload.map(async (block: ConfigurationBlock) => {
      const assertData = createConfigurationBlockInterface().decode(block);
      if (assertData.isLeft()) {
        return {
          error: `Error parsing block info, ${PathReporter.report(assertData)[0]}`,
        };
      }

      try {
        const { blockID, success, error } = await libs.configurationBlocks.save(
          request.user,
          block
        );
        if (error) {
          return { success, error };
        }

        return { success, blockID };
      } catch (err) {
        return { success: false, error: err.msg };
      }
    });

    return Promise.all(result);
  },
});
