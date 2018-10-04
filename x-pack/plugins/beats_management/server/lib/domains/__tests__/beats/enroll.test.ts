/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MemoryBeatsAdapter } from '../../../adapters/beats/memory_beats_adapter';
import { HapiBackendFrameworkAdapter } from '../../../adapters/framework/hapi_framework_adapter';
import { MemoryTagsAdapter } from '../../../adapters/tags/memory_tags_adapter';
import { MemoryTokensAdapter } from '../../../adapters/tokens/memory_tokens_adapter';
import { BeatEnrollmentStatus } from '../../../lib';

import { BeatTag, CMBeat } from '../../../../../common/domain_types';
import { TokenEnrollmentData } from '../../../adapters/tokens/adapter_types';

import { CMBeatsDomain } from '../../beats';
import { CMTagsDomain } from '../../tags';
import { CMTokensDomain } from '../../tokens';

import Chance from 'chance';
import { sign as signToken } from 'jsonwebtoken';
import { omit } from 'lodash';
import moment from 'moment';

const seed = Date.now();
const chance = new Chance(seed);

const settings = {
  encryptionKey: 'something_who_cares',
  enrollmentTokensTtlInSeconds: 10 * 60, // 10 minutes
};

describe('Beats Domain Lib', () => {
  let beatsLib: CMBeatsDomain;
  let tokensLib: CMTokensDomain;

  let beatsDB: CMBeat[] = [];
  let tagsDB: BeatTag[] = [];
  let tokensDB: TokenEnrollmentData[] = [];
  let validEnrollmentToken: string;
  let beatId: string;
  let beat: Partial<CMBeat>;

  describe('enroll_beat', () => {
    beforeEach(async () => {
      validEnrollmentToken = chance.word();
      beatId = chance.word();

      beatsDB = [];
      tagsDB = [];
      tokensDB = [
        {
          expires_on: moment()
            .add(4, 'hours')
            .toJSON(),
          token: validEnrollmentToken,
        },
      ];

      const version =
        chance.integer({ min: 1, max: 10 }) +
        '.' +
        chance.integer({ min: 1, max: 10 }) +
        '.' +
        chance.integer({ min: 1, max: 10 });

      beat = {
        host_name: 'foo.bar.com',
        type: 'filebeat',
        version,
      };

      const framework = new HapiBackendFrameworkAdapter(settings);

      tokensLib = new CMTokensDomain(new MemoryTokensAdapter(tokensDB), {
        framework,
      });

      const tagsLib = new CMTagsDomain(new MemoryTagsAdapter(tagsDB));

      beatsLib = new CMBeatsDomain(new MemoryBeatsAdapter(beatsDB), {
        tags: tagsLib,
        tokens: tokensLib,
        framework,
      });
    });

    it('should enroll beat, returning an access token', async () => {
      const { token } = await tokensLib.getEnrollmentToken(validEnrollmentToken);

      expect(token).toEqual(validEnrollmentToken);
      const { accessToken, status } = await beatsLib.enrollBeat(
        validEnrollmentToken,
        beatId,
        '192.168.1.1',
        omit(beat, 'enrollment_token')
      );
      expect(status).toEqual(BeatEnrollmentStatus.Success);

      expect(beatsDB.length).toEqual(1);
      expect(beatsDB[0]).toHaveProperty('host_ip');
      expect(beatsDB[0]).toHaveProperty('verified_on');

      expect(accessToken).toEqual(beatsDB[0].access_token);

      await tokensLib.deleteEnrollmentToken(validEnrollmentToken);

      expect(tokensDB.length).toEqual(0);
    });

    it('should reject an invalid enrollment token', async () => {
      const { token } = await tokensLib.getEnrollmentToken(chance.word());

      expect(token).toEqual(null);
    });

    it('should reject an expired enrollment token', async () => {
      const { token } = await tokensLib.getEnrollmentToken(
        signToken({}, settings.encryptionKey, {
          expiresIn: '-1min',
        })
      );

      expect(token).toEqual(null);
    });

    it('should delete the given enrollment token so it may not be reused', async () => {
      expect(tokensDB[0].token).toEqual(validEnrollmentToken);
      await tokensLib.deleteEnrollmentToken(validEnrollmentToken);
      expect(tokensDB.length).toEqual(0);

      const { token } = await tokensLib.getEnrollmentToken(validEnrollmentToken);

      expect(token).toEqual(null);
    });
  });
});
