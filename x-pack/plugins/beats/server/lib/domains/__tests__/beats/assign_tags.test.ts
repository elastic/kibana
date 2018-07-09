/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { wrapRequest } from '../../../../utils/wrap_request';
import { MemoryBeatsAdapter } from '../../../adapters/beats/memory_beats_adapter';
import { TestingBackendFrameworkAdapter } from '../../../adapters/famework/testing_framework_adapter';
import { MemoryTagsAdapter } from '../../../adapters/tags/memory_tags_adapter';
import { MemoryTokensAdapter } from '../../../adapters/tokens/memory_tokens_adapter';

import { BeatTag, CMBeat } from '../../../../../common/domain_types';

import { CMBeatsDomain } from '../../beats';
import { CMTagsDomain } from '../../tags';
import { CMTokensDomain } from '../../tokens';

import Chance from 'chance';

const seed = Date.now();
const chance = new Chance(seed);

const fakeReq = wrapRequest({
  headers: {},
  info: {},
  params: {},
  payload: {},
  query: {},
});

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
      const framework = new TestingBackendFrameworkAdapter(null, settings);

      const tokensLib = new CMTokensDomain(new MemoryTokensAdapter([]), {
        framework,
      });

      const tagsLib = new CMTagsDomain(new MemoryTagsAdapter(tagsDB));

      beatsLib = new CMBeatsDomain(new MemoryBeatsAdapter(beatsDB), {
        tags: tagsLib,
        tokens: tokensLib,
      });
    });

    it('should add a single tag to a single beat', async () => {
      const apiResponse = await beatsLib.assignTagsToBeats(fakeReq, [
        { beatId: 'bar', tag: 'production' },
      ]);

      expect(apiResponse.assignments).to.eql([
        { status: 200, result: 'updated' },
      ]);
    });

    it('should not re-add an existing tag to a beat', async () => {
      const tags = ['production'];

      let beat = beatsDB.find(b => b.id === 'foo') as any;
      expect(beat.tags).to.eql([...tags, 'qa']);

      // Adding the existing tag
      const apiResponse = await beatsLib.assignTagsToBeats(fakeReq, [
        { beatId: 'foo', tag: 'production' },
      ]);

      expect(apiResponse.assignments).to.eql([
        { status: 200, result: 'updated' },
      ]);

      beat = beatsDB.find(b => b.id === 'foo') as any;
      expect(beat.tags).to.eql([...tags, 'qa']);
    });

    it('should add a single tag to a multiple beats', async () => {
      const apiResponse = await beatsLib.assignTagsToBeats(fakeReq, [
        { beatId: 'foo', tag: 'development' },
        { beatId: 'bar', tag: 'development' },
      ]);

      expect(apiResponse.assignments).to.eql([
        { status: 200, result: 'updated' },
        { status: 200, result: 'updated' },
      ]);

      let beat = beatsDB.find(b => b.id === 'foo') as any;
      expect(beat.tags).to.eql(['production', 'qa', 'development']); // as beat 'foo' already had 'production' and 'qa' tags attached to it

      beat = beatsDB.find(b => b.id === 'bar') as any;
      expect(beat.tags).to.eql(['development']);
    });

    it('should add multiple tags to a single beat', async () => {
      const apiResponse = await beatsLib.assignTagsToBeats(fakeReq, [
        { beatId: 'bar', tag: 'development' },
        { beatId: 'bar', tag: 'production' },
      ]);

      expect(apiResponse.assignments).to.eql([
        { status: 200, result: 'updated' },
        { status: 200, result: 'updated' },
      ]);

      const beat = beatsDB.find(b => b.id === 'bar') as any;
      expect(beat.tags).to.eql(['development', 'production']);
    });

    it('should add multiple tags to a multiple beats', async () => {
      const apiResponse = await beatsLib.assignTagsToBeats(fakeReq, [
        { beatId: 'foo', tag: 'development' },
        { beatId: 'bar', tag: 'production' },
      ]);

      expect(apiResponse.assignments).to.eql([
        { status: 200, result: 'updated' },
        { status: 200, result: 'updated' },
      ]);

      let beat = beatsDB.find(b => b.id === 'foo') as any;
      expect(beat.tags).to.eql(['production', 'qa', 'development']); // as beat 'foo' already had 'production' and 'qa' tags attached to it

      beat = beatsDB.find(b => b.id === 'bar') as any;
      expect(beat.tags).to.eql(['production']);
    });

    it('should return errors for non-existent beats', async () => {
      const nonExistentBeatId = chance.word();

      const apiResponse = await beatsLib.assignTagsToBeats(fakeReq, [
        { beatId: nonExistentBeatId, tag: 'production' },
      ]);

      expect(apiResponse.assignments).to.eql([
        { status: 404, result: `Beat ${nonExistentBeatId} not found` },
      ]);
    });

    it('should return errors for non-existent tags', async () => {
      const nonExistentTag = chance.word();

      const apiResponse = await beatsLib.assignTagsToBeats(fakeReq, [
        { beatId: 'bar', tag: nonExistentTag },
      ]);

      expect(apiResponse.assignments).to.eql([
        { status: 404, result: `Tag ${nonExistentTag} not found` },
      ]);

      const beat = beatsDB.find(b => b.id === 'bar') as any;
      expect(beat).to.not.have.property('tags');
    });

    it('should return errors for non-existent beats and tags', async () => {
      const nonExistentBeatId = chance.word();
      const nonExistentTag = chance.word();

      const apiResponse = await beatsLib.assignTagsToBeats(fakeReq, [
        { beatId: nonExistentBeatId, tag: nonExistentTag },
      ]);

      expect(apiResponse.assignments).to.eql([
        {
          result: `Beat ${nonExistentBeatId} and tag ${nonExistentTag} not found`,
          status: 404,
        },
      ]);

      const beat = beatsDB.find(b => b.id === 'bar') as any;
      expect(beat).to.not.have.property('tags');
    });
  });
});
