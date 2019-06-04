/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import Joi from 'joi';
import { REQUIRED_LICENSES } from '../../../common/constants';
import {
  ConfigurationBlock,
  createConfigurationBlockInterface,
} from '../../../common/domain_types';
import { ReturnTypeBulkUpsert } from '../../../common/return_types';
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
  handler: async (request: FrameworkRequest): Promise<ReturnTypeBulkUpsert> => {
    const result = await Promise.all<any>(
      request.payload.map(async (block: ConfigurationBlock) => {
        const assertData = createConfigurationBlockInterface().decode(block);
        if (assertData.isLeft()) {
          return {
            error: `Error parsing block info, ${PathReporter.report(assertData)[0]}`,
          };
        }

        const { blockID, success, error } = await libs.configurationBlocks.save(
          request.user,
          block
        );
        if (error) {
          return { success, error };
        }

        return { success, blockID };
      })
    );

    return {
      results: result.map(r => ({
        success: r.success as boolean,
        // TODO: we need to surface this data, not hard coded
        action: 'created' as 'created' | 'updated',
      })),
      success: true,
    };
  },
});
