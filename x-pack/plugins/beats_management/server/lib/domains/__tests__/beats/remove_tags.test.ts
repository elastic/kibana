/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BeatTag, CMBeat } from '../../../../../common/domain_types';
import { FrameworkInternalUser } from '../../../adapters/framework/adapter_types';
import { compose } from '../../../compose/testing';
import { CMServerLibs } from '../../../lib';

const internalUser: FrameworkInternalUser = { kind: 'internal' };

describe('Beats Domain Lib', () => {
  let libs: CMServerLibs;
  let beatsDB: Array<Partial<CMBeat>> = [];
  let tagsDB: BeatTag[] = [];

  describe('remove_tags_from_beats', () => {
    beforeEach(async () => {
      beatsDB = [
        {
          access_token: '9a6c99ae0fd84b068819701169cd8a4b',
          active: true,
          enrollment_token: '123kuil;4',
          host_ip: '1.2.3.4',
          host_name: 'foo.bar.com',
          id: 'qux',
          type: 'filebeat',
        },
        {
          access_token: '188255eb560a4448b72656c5e99cae6f',
          active: true,
          enrollment_token: '12fghjyu34',
          host_ip: '22.33.11.44',
          host_name: 'baz.bar.com',
          id: 'baz',
          type: 'metricbeat',
        },
        {
          access_token: '93c4a4dd08564c189a7ec4e4f046b975',
          active: true,
          enrollment_token: '12nfhgj34',
          host_ip: '1.2.3.4',
          host_name: 'foo.bar.com',
          id: 'foo',
          tags: ['production', 'qa'],
          type: 'metricbeat',
          verified_on: '2018-05-15T16:25:38.924Z',
        },
        {
          access_token: '3c4a4dd08564c189a7ec4e4f046b9759',
          active: true,

          enrollment_token: '123sfd4',
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

      libs = compose({
        tagsDB,
        beatsDB,
      });
    });

    it('should remove a single tag from a single beat', async () => {
      const apiResponse = await libs.beats.removeTagsFromBeats(internalUser, [
        { beatId: 'foo', tag: 'production' },
      ]);

      expect(apiResponse.removals).toEqual([{ status: 200, result: 'updated' }]);
      // @ts-ignore
      expect(beatsDB.find(b => b.id === 'foo').tags).toEqual(['qa']);
    });

    it('should remove a single tag from a multiple beats', async () => {
      const apiResponse = await libs.beats.removeTagsFromBeats(internalUser, [
        { beatId: 'foo', tag: 'development' },
        { beatId: 'bar', tag: 'development' },
      ]);

      expect(apiResponse.removals).toEqual([
        { status: 200, result: 'updated' },
        { status: 200, result: 'updated' },
      ]);

      // @ts-ignore
      expect(beatsDB.find(b => b.id === 'foo').tags).toEqual(['production', 'qa']);
      expect(beatsDB.find(b => b.id === 'bar')).not.toHaveProperty('tags');
    });
  });
});
