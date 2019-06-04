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

import Joi from 'joi';
import { get } from 'lodash';
import { REQUIRED_LICENSES } from '../../../common/constants';
import { BeatTag } from '../../../common/domain_types';
import { ReturnTypeUpsert } from '../../../common/return_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';

// TODO: write to Kibana audit log file
export const createSetTagRoute = (libs: CMServerLibs) => ({
  method: 'PUT',
  path: '/api/beats/tag/{tagId}',
  licenseRequired: REQUIRED_LICENSES,
  requiredRoles: ['beats_admin'],
  config: {
    validate: {
      params: Joi.object({
        tagId: Joi.string(),
      }),
      payload: Joi.object({
        color: Joi.string(),
        name: Joi.string(),
      }),
    },
  },
  handler: async (request: FrameworkRequest): Promise<ReturnTypeUpsert<BeatTag>> => {
    const defaultConfig = {
      id: request.params.tagId,
      name: request.params.tagId,
      color: '#DD0A73',
      hasConfigurationBlocksTypes: [],
    };
    const config = { ...defaultConfig, ...get(request, 'payload', {}) };

    const id = await libs.tags.upsertTag(request.user, config);
    const tag = await libs.tags.getWithIds(request.user, [id]);

    // TODO the action needs to be surfaced
    return { success: true, item: tag[0], action: 'created' };
  },
});
