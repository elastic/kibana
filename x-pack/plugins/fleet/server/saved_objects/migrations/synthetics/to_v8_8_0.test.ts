/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationContext } from '@kbn/core/server';

import { getBrowserPolicy, httpPolicy, icmpPolicy, tcpPolicy } from './fixtures/8.7.0';

import { migratePackagePolicyToV880 as migration } from './to_v8_8_0';

describe('8.8.0 Synthetics Package Policy migration', () => {
  describe('schedule migration', () => {
    const testSchedules = [
      ['4', '3'],
      ['4.5', '5'],
      ['7', '5'],
      ['8', '10'],
      ['9.5', '10'],
      ['12', '10'],
      ['13', '15'],
      ['16', '15'],
      ['18', '20'],
      ['21', '20'],
      ['25', '20'],
      ['26', '30'],
      ['31', '30'],
      ['45', '30'],
      ['46', '60'],
      ['61', '60'],
      ['90', '60'],
      ['91', '120'],
      ['121', '120'],
      ['195', '240'],
      ['600', '240'],
    ];

    it.each(testSchedules)('handles a variety of schedules', (invalidSchedule, validSchedule) => {
      const actual = migration(
        {
          ...httpPolicy,
          attributes: {
            ...httpPolicy.attributes,
            inputs: [
              {
                ...httpPolicy.attributes.inputs[0],
                streams: [
                  {
                    ...httpPolicy.attributes.inputs[0].streams[0],
                    vars: {
                      ...httpPolicy.attributes.inputs[0].streams[0].vars,
                      schedule: {
                        value: `"@every ${invalidSchedule}m"`,
                        type: 'text',
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
        {} as SavedObjectMigrationContext
      );
      expect(actual.attributes?.inputs[0]?.streams[0]?.vars?.schedule?.value).toEqual(
        `"@every ${validSchedule}m"`
      );
      expect(actual.attributes?.inputs[0]?.streams[0]?.compiled_stream?.schedule).toEqual(
        `@every ${validSchedule}m`
      );
    });

    it('handles browserPolicy with 2 minute', () => {
      const actual = migration(getBrowserPolicy(), {} as SavedObjectMigrationContext);
      expect(actual.attributes?.inputs[3]?.streams[0]?.vars?.schedule?.value).toEqual(
        '"@every 1m"'
      );
      expect(actual.attributes?.inputs[3]?.streams[0]?.compiled_stream?.schedule).toEqual(
        `@every 1m`
      );
    });

    it('handles httpPolicy with 4 minute schedule', () => {
      const actual = migration(httpPolicy, {} as SavedObjectMigrationContext);
      expect(actual.attributes?.inputs[0]?.streams[0]?.vars?.schedule?.value).toEqual(
        '"@every 3m"'
      );
      expect(actual.attributes?.inputs[0]?.streams[0]?.compiled_stream?.schedule).toEqual(
        `@every 3m`
      );
    });

    it('handles tcp with 8 minute schedule', () => {
      const actual = migration(tcpPolicy, {} as SavedObjectMigrationContext);
      expect(actual.attributes?.inputs[1]?.streams[0]?.vars?.schedule?.value).toEqual(
        '"@every 10m"'
      );
      expect(actual.attributes?.inputs[1]?.streams[0]?.compiled_stream?.schedule).toEqual(
        `@every 10m`
      );
    });

    it('handles icmpPolicy with 16 minute schedule', () => {
      const actual = migration(icmpPolicy, {} as SavedObjectMigrationContext);
      expect(actual.attributes?.inputs[2]?.streams[0]?.vars?.schedule?.value).toEqual(
        '"@every 15m"'
      );
      expect(actual.attributes?.inputs[2]?.streams[0]?.compiled_stream?.schedule).toEqual(
        `@every 15m`
      );
    });
  });

  describe('throttling migration', () => {
    it('handles throttling config for throttling: false', () => {
      const actual = migration(getBrowserPolicy('false'), {} as SavedObjectMigrationContext);
      expect(actual.attributes?.inputs[3]?.streams[0]?.vars?.['throttling.config']?.value).toEqual(
        'false'
      );
      expect(actual.attributes?.inputs[3]?.streams[0]?.compiled_stream?.throttling).toEqual(false);
    });

    it('handles throttling config for default  throttling', () => {
      const actual = migration(getBrowserPolicy(), {} as SavedObjectMigrationContext);
      expect(actual.attributes?.inputs[3]?.streams[0]?.vars?.['throttling.config']?.value).toEqual(
        JSON.stringify({ download: 5, upload: 3, latency: 20 })
      );
      expect(actual.attributes?.inputs[3]?.streams[0]?.compiled_stream.throttling).toEqual({
        download: 5,
        upload: 3,
        latency: 20,
      });
    });

    it('handles throttling config for custom throttling', () => {
      const actual = migration(
        getBrowserPolicy('1.6d/0.75u/150l'),
        {} as SavedObjectMigrationContext
      );
      expect(actual.attributes?.inputs[3]?.streams[0]?.vars?.['throttling.config']?.value).toEqual(
        JSON.stringify({ download: 1.6, upload: 0.75, latency: 150 })
      );
      expect(actual.attributes?.inputs[3]?.streams[0]?.compiled_stream.throttling).toEqual({
        download: 1.6,
        upload: 0.75,
        latency: 150,
      });
    });

    it('handles edge cases', () => {
      const actual = migration(
        getBrowserPolicy('not a valid value'),
        {} as SavedObjectMigrationContext
      );
      expect(actual.attributes?.inputs[3]?.streams[0]?.vars?.['throttling.config']?.value).toEqual(
        JSON.stringify({ download: 5, upload: 3, latency: 20 })
      );
      expect(actual.attributes?.inputs[3]?.streams[0]?.compiled_stream.throttling).toEqual({
        download: 5,
        upload: 3,
        latency: 20,
      });
    });
  });

  describe('location id migration', () => {
    it('set run from id as agent policy id', () => {
      const actual = migration(httpPolicy, {} as SavedObjectMigrationContext);
      expect(actual.attributes?.inputs[0]?.streams[0]?.vars?.location_id?.value).toEqual(
        'fa2e69b0-dec6-11ed-8746-c5b1a1a12ec1'
      );
      expect(actual.attributes?.inputs[0]?.streams[0]?.compiled_stream?.location_id).toEqual(
        'fa2e69b0-dec6-11ed-8746-c5b1a1a12ec1'
      );
    });
  });
});
