/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MemoryBeatsAdapter } from '../../../adapters/beats/memory_beats_adapter';
import { TestingBackendFrameworkAdapter } from '../../../adapters/framework/testing_framework_adapter';
import { MemoryTagsAdapter } from '../../../adapters/tags/memory_tags_adapter';
import { MemoryTokensAdapter } from '../../../adapters/tokens/memory_tokens_adapter';

import { BeatTag, CMBeat } from '../../../../../common/domain_types';
import { TokenEnrollmentData } from '../../../adapters/tokens/adapter_types';

import { CMBeatsDomain } from '../../beats';
import { CMTagsDomain } from '../../tags';
import { CMTokensDomain } from '../../tokens';

import Chance from 'chance';

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

  describe('verify_beat', () => {
    beforeEach(async () => {
      beatsDB = [
        {
          access_token: '9a6c99ae0fd84b068819701169cd8a4b',
          host_ip: '1.2.3.4',
          host_name: 'foo.bar.com',
          id: 'qux',
          type: 'filebeat',
        },
        {
          access_token: '188255eb560a4448b72656c5e99cae6f',
          host_ip: '22.33.11.44',
          host_name: 'baz.bar.com',
          id: 'baz',
          type: 'metricbeat',
        },
        {
          access_token: '93c4a4dd08564c189a7ec4e4f046b975',
          host_ip: '1.2.3.4',
          host_name: 'foo.bar.com',
          id: 'foo',
          tags: ['production', 'qa'],
          type: 'metricbeat',
          verified_on: '2018-05-15T16:25:38.924Z',
        },
        {
          access_token: '3c4a4dd08564c189a7ec4e4f046b9759',
          host_ip: '11.22.33.44',
          host_name: 'foo.com',
          id: 'bar',
          type: 'filebeat',
        },
      ];
      tagsDB = [
        {
          configuration_blocks: [],
          id: 'production',
        },
        {
          configuration_blocks: [],
          id: 'development',
        },
        {
          configuration_blocks: [],
          id: 'qa',
        },
      ];
      tokensDB = [];

      const framework = new TestingBackendFrameworkAdapter(null, settings);

      tokensLib = new CMTokensDomain(new MemoryTokensAdapter(tokensDB), {
        framework,
      });

      const tagsLib = new CMTagsDomain(new MemoryTagsAdapter(tagsDB));

      beatsLib = new CMBeatsDomain(new MemoryBeatsAdapter(beatsDB), {
        tags: tagsLib,
        tokens: tokensLib,
      });
    });

    it('should return errors for non-existent beats', async () => {
      const nonExistentBeatId = chance.word();

      interface Beats {
        id: string;
        status?: number;
        result?: string;
      }

      const beats: Beats[] = [{ id: 'bar' }, { id: nonExistentBeatId }];
      const beatIds = beats.map(b => b.id);

      const {
        verifiedBeatIds,
        alreadyVerifiedBeatIds,
        nonExistentBeatIds,
      } = await beatsLib.verifyBeats({ kind: 'unauthenticated' }, beatIds);

      // TODO calculation of status should be done in-lib, w/switch statement here
      beats.forEach(b => {
        if (nonExistentBeatIds.includes(b.id)) {
          b.status = 404;
          b.result = 'not found';
        } else if (alreadyVerifiedBeatIds.includes(b.id)) {
          b.status = 200;
          b.result = 'already verified';
        } else if (verifiedBeatIds.includes(b.id)) {
          b.status = 200;
          b.result = 'verified';
        } else {
          b.status = 400;
          b.result = 'not verified';
        }
      });

      const response = { beats };
      expect(response.beats).toEqual([
        { id: 'bar', status: 200, result: 'verified' },
        { id: nonExistentBeatId, status: 404, result: 'not found' },
      ]);
    });

    it('should not re-verify already-verified beats', async () => {
      interface Beats {
        id: string;
        status?: number;
        result?: string;
      }

      const beats: Beats[] = [{ id: 'foo' }, { id: 'bar' }];
      const beatIds = beats.map(b => b.id);

      const {
        verifiedBeatIds,
        alreadyVerifiedBeatIds,
        nonExistentBeatIds,
      } = await beatsLib.verifyBeats({ kind: 'unauthenticated' }, beatIds);

      // TODO calculation of status should be done in-lib, w/switch statement here
      beats.forEach(beat => {
        if (nonExistentBeatIds.includes(beat.id)) {
          beat.status = 404;
          beat.result = 'not found';
        } else if (alreadyVerifiedBeatIds.includes(beat.id)) {
          beat.status = 200;
          beat.result = 'already verified';
        } else if (verifiedBeatIds.includes(beat.id)) {
          beat.status = 200;
          beat.result = 'verified';
        } else {
          beat.status = 400;
          beat.result = 'not verified';
        }
      });

      const response = { beats };
      expect(response.beats).toEqual([
        { id: 'foo', status: 200, result: 'already verified' },
        { id: 'bar', status: 200, result: 'verified' },
      ]);
    });
  });
});
