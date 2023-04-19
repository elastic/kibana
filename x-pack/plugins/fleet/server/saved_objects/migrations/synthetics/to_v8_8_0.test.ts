/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationContext } from '@kbn/core/server';

import { browserPolicy, httpPolicy, icmpPolicy, tcpPolicy } from './fixtures/8.7.0';

import { migratePackagePolicyToV880 as migration } from './to_v8_8_0';

describe('8.8.0 Synthetics Package Policy migration', () => {
  describe('schedule migration', () => {
    const testSchedules = [
      ['4', '3'],
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
      expect(
        migration(
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
                          value: `@every ${invalidSchedule}m`,
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
        ).attributes?.inputs[0]?.streams[0]?.vars?.schedule?.value
      ).toEqual(`@every ${validSchedule}m`);
    });

    it('handles browserPolicy with 2 minute', () => {
      expect(
        migration(browserPolicy, {} as SavedObjectMigrationContext).attributes?.inputs[3]
          ?.streams[0]?.vars?.schedule?.value
      ).toEqual('@every 1m');
    });

    it('handles httpPolicy with 4 minute schedule', () => {
      expect(
        migration(httpPolicy, {} as SavedObjectMigrationContext).attributes?.inputs[0]?.streams[0]
          ?.vars?.schedule?.value
      ).toEqual('@every 3m');
    });

    it('handles tcp with 8 minute schedule', () => {
      expect(
        migration(tcpPolicy, {} as SavedObjectMigrationContext).attributes?.inputs[1]?.streams[0]
          ?.vars?.schedule?.value
      ).toEqual('@every 10m');
    });

    it('handles icmpPolicy with 16 minute schedule', () => {
      expect(
        migration(icmpPolicy, {} as SavedObjectMigrationContext).attributes?.inputs[2]?.streams[0]
          ?.vars?.schedule?.value
      ).toEqual('@every 15m');
    });
  });
});
