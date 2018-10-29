/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkInternalUser } from '../../../adapters/framework/adapter_types';

import { MemoryBeatsAdapter } from '../../../adapters/beats/memory_beats_adapter';
import { HapiBackendFrameworkAdapter } from '../../../adapters/framework/hapi_framework_adapter';
import { MemoryTagsAdapter } from '../../../adapters/tags/memory_tags_adapter';
import { MemoryTokensAdapter } from '../../../adapters/tokens/memory_tokens_adapter';

import { BeatTag, CMBeat } from '../../../../../common/domain_types';

import { CMBeatsDomain } from '../../beats';
import { CMTagsDomain } from '../../tags';
import { CMTokensDomain } from '../../tokens';

import Chance from 'chance';

const seed = Date.now();
const chance = new Chance(seed);

const internalUser: FrameworkInternalUser = { kind: 'internal' };

const settings = {
  encryptionKey: 'something_who_cares',
  enrollmentTokensTtlInSeconds: 10 * 60, // 10 minutes
};

describe('Beats Domain Lib', () => {
  let beatsLib: CMBeatsDomain;
  let beatsDB: CMBeat[] = [];
  let tagsDB: BeatTag[] = [];

  describe('assign_tags_to_beats', () => {
    beforeEach(async () => {
      beatsDB = [
        {
          access_token: '9a6c99ae0fd84b068819701169cd8a4b',
          config_status: 'OK',
          active: true,
          enrollment_token: '23423423423',
          host_ip: '1.2.3.4',
          host_name: 'foo.bar.com',
          id: 'qux',
          type: 'filebeat',
        },
        {
          access_token: '188255eb560a4448b72656c5e99cae6f',
          active: true,
          config_status: 'OK',
          enrollment_token: 'reertrte',
          host_ip: '22.33.11.44',
          host_name: 'baz.bar.com',
          id: 'baz',
          type: 'metricbeat',
        },
        {
          access_token: '93c4a4dd08564c189a7ec4e4f046b975',
          active: true,
          enrollment_token: '23s423423423',
          config_status: 'OK',
          host_ip: '1.2.3.4',
          host_name: 'foo.bar.com',
          id: 'foo',
          tags: ['production', 'qa'],
          type: 'metricbeat',
          verified_on: '2018-05-15T16:25:38.924Z',
        },
        {
          access_token: '3c4a4dd08564c189a7ec4e4f046b9759',
          enrollment_token: 'gdfsgdf',
          active: true,
          config_status: 'OK',
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
          last_updated: new Date(),
        },
        {
          configuration_blocks: [],
          id: 'development',
          last_updated: new Date(),
        },
        {
          configuration_blocks: [],
          id: 'qa',
          last_updated: new Date(),
        },
      ];
      const framework = new HapiBackendFrameworkAdapter(settings);

      const tokensLib = new CMTokensDomain(new MemoryTokensAdapter([]), {
        framework,
      });

      const tagsLib = new CMTagsDomain(new MemoryTagsAdapter(tagsDB));

      beatsLib = new CMBeatsDomain(new MemoryBeatsAdapter(beatsDB), {
        tags: tagsLib,
        tokens: tokensLib,
        framework,
      });
    });

    it('should add a single tag to a single beat', async () => {
      const apiResponse = await beatsLib.assignTagsToBeats(internalUser, [
        { beatId: 'bar', tag: 'production' },
      ]);

      expect(apiResponse.assignments).toEqual([{ status: 200, result: 'updated' }]);
    });

    it('should not re-add an existing tag to a beat', async () => {
      const tags = ['production'];

      let beat = beatsDB.find(b => b.id === 'foo') as any;
      expect(beat.tags).toEqual([...tags, 'qa']);

      // Adding the existing tag
      const apiResponse = await beatsLib.assignTagsToBeats(internalUser, [
        { beatId: 'foo', tag: 'production' },
      ]);

      expect(apiResponse.assignments).toEqual([{ status: 200, result: 'updated' }]);

      beat = beatsDB.find(b => b.id === 'foo') as any;
      expect(beat.tags).toEqual([...tags, 'qa']);
    });

    it('should add a single tag to a multiple beats', async () => {
      const apiResponse = await beatsLib.assignTagsToBeats(internalUser, [
        { beatId: 'foo', tag: 'development' },
        { beatId: 'bar', tag: 'development' },
      ]);

      expect(apiResponse.assignments).toEqual([
        { status: 200, result: 'updated' },
        { status: 200, result: 'updated' },
      ]);

      let beat = beatsDB.find(b => b.id === 'foo') as any;
      expect(beat.tags).toEqual(['production', 'qa', 'development']); // as beat 'foo' already had 'production' and 'qa' tags attached to it

      beat = beatsDB.find(b => b.id === 'bar') as any;
      expect(beat.tags).toEqual(['development']);
    });

    it('should add multiple tags to a single beat', async () => {
      const apiResponse = await beatsLib.assignTagsToBeats(internalUser, [
        { beatId: 'bar', tag: 'development' },
        { beatId: 'bar', tag: 'production' },
      ]);

      expect(apiResponse.assignments).toEqual([
        { status: 200, result: 'updated' },
        { status: 200, result: 'updated' },
      ]);

      const beat = beatsDB.find(b => b.id === 'bar') as any;
      expect(beat.tags).toEqual(['development', 'production']);
    });

    it('should add multiple tags to a multiple beats', async () => {
      const apiResponse = await beatsLib.assignTagsToBeats(internalUser, [
        { beatId: 'foo', tag: 'development' },
        { beatId: 'bar', tag: 'production' },
      ]);

      expect(apiResponse.assignments).toEqual([
        { status: 200, result: 'updated' },
        { status: 200, result: 'updated' },
      ]);

      let beat = beatsDB.find(b => b.id === 'foo') as any;
      expect(beat.tags).toEqual(['production', 'qa', 'development']); // as beat 'foo' already had 'production' and 'qa' tags attached to it

      beat = beatsDB.find(b => b.id === 'bar') as any;
      expect(beat.tags).toEqual(['production']);
    });

    it('should return errors for non-existent beats', async () => {
      const nonExistentBeatId = chance.word();

      const apiResponse = await beatsLib.assignTagsToBeats(internalUser, [
        { beatId: nonExistentBeatId, tag: 'production' },
      ]);

      expect(apiResponse.assignments).toEqual([
        { status: 404, result: `Beat ${nonExistentBeatId} not found` },
      ]);
    });

    it('should return errors for non-existent tags', async () => {
      const nonExistentTag = chance.word();

      const apiResponse = await beatsLib.assignTagsToBeats(internalUser, [
        { beatId: 'bar', tag: nonExistentTag },
      ]);

      expect(apiResponse.assignments).toEqual([
        { status: 404, result: `Tag ${nonExistentTag} not found` },
      ]);

      const beat = beatsDB.find(b => b.id === 'bar') as any;
      expect(beat).not.toHaveProperty('tags');
    });

    it('should return errors for non-existent beats and tags', async () => {
      const nonExistentBeatId = chance.word();
      const nonExistentTag = chance.word();

      const apiResponse = await beatsLib.assignTagsToBeats(internalUser, [
        { beatId: nonExistentBeatId, tag: nonExistentTag },
      ]);

      expect(apiResponse.assignments).toEqual([
        {
          result: `Beat ${nonExistentBeatId} and tag ${nonExistentTag} not found`,
          status: 404,
        },
      ]);

      const beat = beatsDB.find(b => b.id === 'bar') as any;
      expect(beat).not.toHaveProperty('tags');
    });
  });
});
