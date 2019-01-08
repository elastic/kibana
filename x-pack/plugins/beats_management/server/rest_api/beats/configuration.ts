/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { CMBeat, ConfigurationBlock } from '../../../common/domain_types';
import { CMServerLibs } from '../../lib/types';
import { wrapEsError } from '../../utils/error_wrappers';

export const createGetBeatConfigurationRoute = (libs: CMServerLibs) => ({
  method: 'GET',
  path: '/api/beats/agent/{beatId}/configuration',
  config: {
    validate: {
      headers: Joi.object({
        'kbn-beats-access-token': Joi.string().required(),
      }).options({ allowUnknown: true }),
      query: Joi.object({
        validSetting: Joi.boolean().default(true),
      }),
    },
    auth: false,
  },
  handler: async (request: any, h: any) => {
    const beatId = request.params.beatId;
    const accessToken = request.headers['kbn-beats-access-token'];

    let beat;
    let configurationBlocks: ConfigurationBlock[];
    try {
      beat = await libs.beats.getById(libs.framework.internalUser, beatId);
      if (beat === null) {
        return h.response({ message: `Beat "${beatId}" not found` }).code(404);
      }

      const isAccessTokenValid = beat.access_token === accessToken;
      if (!isAccessTokenValid) {
        return h.response({ message: 'Invalid access token' }).code(401);
      }

      let newStatus: CMBeat['config_status'] = 'OK';
      if (!request.query.validSetting) {
        newStatus = 'ERROR';
      }

      await libs.beats.update(libs.framework.internalUser, beat.id, {
        config_status: newStatus,
        last_checkin: new Date(),
      });

      if (beat.tags) {
        const result = await libs.configurationBlocks.getForTags(
          libs.framework.internalUser,
          beat.tags,
          -1
        );

        configurationBlocks = result.blocks;
      } else {
        configurationBlocks = [];
      }
    } catch (err) {
      return wrapEsError(err);
    }

    return {
      configuration_blocks: configurationBlocks,
    };
  },
});
