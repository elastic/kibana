/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Chance from 'chance';
import { BeatTag, CMBeat } from '../../../../../common/domain_types';
import { MemoryBeatsAdapter } from '../../../adapters/beats/memory_beats_adapter';
import { HapiBackendFrameworkAdapter } from '../../../adapters/framework/hapi_framework_adapter';
import { MemoryTagsAdapter } from '../../../adapters/tags/memory_tags_adapter';
import { TokenEnrollmentData } from '../../../adapters/tokens/adapter_types';
import { MemoryTokensAdapter } from '../../../adapters/tokens/memory_tokens_adapter';
import { CMBeatsDomain } from '../../beats';
import { CMTagsDomain } from '../../tags';
import { CMTokensDomain } from '../../tokens';

const seed = Date.now();
const chance = new Chance(seed);

const settings = {
  encryptionKey: `it's_a_secret`,
  enrollmentTokensTtlInSeconds: 10 * 60, // 10 minutes
};

describe('Beats Domain lib', () => {
  describe('update_beat', () => {
    let beatsLib: CMBeatsDomain;
    let tokensLib: CMTokensDomain;
    let token: TokenEnrollmentData;
    let beatsDB: CMBeat[] = [];
    let tagsDB: BeatTag[] = [];
    let tokensDB: TokenEnrollmentData[];
    let beatId: string;
    let beat: Partial<CMBeat>;

    const getBeatsLib = async () => {
      const framework = new HapiBackendFrameworkAdapter(settings);

      tokensLib = new CMTokensDomain(new MemoryTokensAdapter(tokensDB), { framework });
      const tagsLib = new CMTagsDomain(new MemoryTagsAdapter(tagsDB));

      beatsLib = new CMBeatsDomain(new MemoryBeatsAdapter(beatsDB), {
        framework,
        tags: tagsLib,
        tokens: tokensLib,
      });

      await tokensLib.createEnrollmentTokens(framework.internalUser, 1);
      token = tokensDB[0];
    };

    beforeEach(async () => {
      beatId = chance.word();
      beat = {
        host_name: 'foo.bar.com',
        type: 'filebeat',
        version: '6.4.0',
      };
      beatsDB = [];
      tagsDB = [];
      tokensDB = [];

      getBeatsLib();
    });

    it('should return a not-found message if beat does not exist', async () => {
      const tokenString = token.token || '';
      const result = await beatsLib.update(tokenString, beatId, beat);

      expect(result).toBe('beat-not-found');
    });

    it('should return an invalid message if token validation fails', async () => {
      const beatToFind: CMBeat = {
        id: beatId,
        config_status: 'OK',
        enrollment_token: '',
        active: true,
        access_token: token.token || '',
        type: 'filebeat',
        host_ip: 'localhost',
        host_name: 'foo.bar.com',
      };
      beatsDB = [beatToFind];

      getBeatsLib();

      const result = await beatsLib.update('something_invalid', beatId, beat);

      expect(result).toBe('invalid-access-token');
    });

    it('should update the beat when a valid token is provided', async () => {
      const beatToFind: CMBeat = {
        id: beatId,
        config_status: 'OK',
        enrollment_token: '',
        active: true,
        access_token: token.token || '',
        type: 'metricbeat',
        host_ip: 'localhost',
        host_name: 'bar.foo.com',
        version: '6.3.5',
      };
      beatsDB = [beatToFind];
      getBeatsLib();
      // @ts-ignore
      await beatsLib.update(token, beatId, beat);
      expect(beatsDB).toHaveLength(1);
      const updatedBeat = beatsDB[0];
      expect(updatedBeat.id).toBe(beatId);
      expect(updatedBeat.host_name).toBe('foo.bar.com');
      expect(updatedBeat.version).toBe('6.4.0');
      expect(updatedBeat.type).toBe('filebeat');
    });
  });
});
