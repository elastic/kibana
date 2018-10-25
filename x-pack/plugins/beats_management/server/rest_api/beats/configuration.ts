/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { omit } from 'lodash';
import { BeatTag, CMBeat, ConfigurationBlock } from '../../../common/domain_types';
import { CMServerLibs } from '../../lib/lib';
import { wrapEsError } from '../../utils/error_wrappers';
import { ReturnedConfigurationBlock } from './../../../common/domain_types';

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
  handler: async (request: any, reply: any) => {
    const beatId = request.params.beatId;
    const accessToken = request.headers['kbn-beats-access-token'];

    let beat;
    let tags;
    try {
      beat = await libs.beats.getById(libs.framework.internalUser, beatId);
      if (beat === null) {
        return reply({ message: `Beat "${beatId}" not found` }).code(404);
      }

      const isAccessTokenValid = beat.access_token === accessToken;
      if (!isAccessTokenValid) {
        return reply({ message: 'Invalid access token' }).code(401);
      }

      let newStatus: CMBeat['config_status'] = 'OK';
      if (!request.query.validSetting) {
        newStatus = 'ERROR';
      }

      await libs.beats.update(libs.framework.internalUser, beat.id, {
        config_status: newStatus,
        last_checkin: new Date(),
      });

      tags = await libs.tags.getTagsWithIds(libs.framework.internalUser, beat.tags || []);
    } catch (err) {
      return reply(wrapEsError(err));
    }

    const configurationBlocks = tags.reduce(
      (blocks: ReturnedConfigurationBlock[], tag: BeatTag) => {
        blocks = blocks.concat(
          tag.configuration_blocks.reduce(
            (acc: ReturnedConfigurationBlock[], block: ConfigurationBlock) => {
              acc.push({
                ...omit(block, ['configs']),
                config: block.configs[0],
              });
              return acc;
            },
            []
          )
        );
        return blocks;
      },
      []
    );

    reply({
      configuration_blocks: configurationBlocks,
    });
  },
});
