/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { migration880 } from './8.8.0';
import { migrationMocks } from '@kbn/core/server/mocks';
import { ConfigKey, ScheduleUnit } from '../../../../common/runtime_types';
import {
  ALLOWED_SCHEDULES_IN_MINUTES,
  PROFILE_VALUES_ENUM,
  PROFILES_MAP,
} from '../../../../common/constants/monitor_defaults';
import {
  browserUI,
  browserProject,
  browserUptimeUI,
  tcpUptimeUI,
  icmpUptimeUI,
  httpUptimeUI,
} from './test_fixtures/8.7.0';
import { httpUI as httpUI850 } from './test_fixtures/8.5.0';
import { LegacyConfigKey } from '../../../../common/constants/monitor_management';
import { omit } from 'lodash';

const context = migrationMocks.createContext();
const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();

describe('Monitor migrations v8.7.0 -> v8.8.0', () => {
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

  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(({ migration }) => migration);
  });

  describe('alerting config', () => {
    it('sets alerting config when it is not defined', () => {
      expect(httpUI850.attributes[ConfigKey.ALERT_CONFIG]).toBeUndefined();
      const actual = migration880(encryptedSavedObjectsSetup)(httpUI850, context);
      expect(actual.attributes[ConfigKey.ALERT_CONFIG]).toEqual({
        status: {
          enabled: true,
        },
      });
    });

    it('uses existing alerting config when it is defined', () => {
      const testMonitor = {
        ...browserUI,
        attributes: {
          ...browserUI.attributes,
          [ConfigKey.ALERT_CONFIG]: {
            status: {
              enabled: false,
            },
          },
        },
      };
      expect(testMonitor.attributes[ConfigKey.ALERT_CONFIG]).toBeTruthy();
      const actual = migration880(encryptedSavedObjectsSetup)(testMonitor, context);
      expect(actual.attributes[ConfigKey.ALERT_CONFIG]).toEqual({
        status: {
          enabled: false,
        },
      });
    });
  });

  describe('config hash', () => {
    it('sets config hash back to empty string', () => {
      expect(browserProject.attributes[ConfigKey.CONFIG_HASH]).toBeTruthy();
      const actual = migration880(encryptedSavedObjectsSetup)(browserProject, context);
      expect(actual.attributes[ConfigKey.CONFIG_HASH]).toEqual('');
    });
  });

  describe('zip url deprecation', () => {
    it('removes all top level zip url fields for synthetics UI monitor', () => {
      expect(
        Object.keys(browserUI.attributes).some((key: string) => key.includes('zip_url'))
      ).toEqual(true);
      const actual = migration880(encryptedSavedObjectsSetup)(browserUI, context);
      expect(actual).toEqual({
        attributes: {
          __ui: {
            script_source: {
              file_name: '',
              is_generated_script: false,
            },
          },
          alert: {
            status: {
              enabled: true,
            },
          },
          config_id: '311cf324-2fc9-4453-9ba5-5e745fd81722',
          enabled: true,
          'filter_journeys.match': '',
          'filter_journeys.tags': [],
          form_monitor_type: 'multistep',
          hash: '',
          id: '311cf324-2fc9-4453-9ba5-5e745fd81722',
          ignore_https_errors: false,
          journey_id: '',
          locations: [
            {
              geo: {
                lat: 41.25,
                lon: -95.86,
              },
              id: 'us_central',
              isServiceManaged: true,
              label: 'North America - US Central',
            },
          ],
          max_attempts: 2,
          name: 'https://elastic.co',
          namespace: 'default',
          origin: 'ui',
          playwright_options: '',
          playwright_text_assertion: '',
          project_id: '',
          revision: 1,
          schedule: {
            number: '10',
            unit: 'm',
          },
          screenshots: 'on',
          secrets:
            '{"params":"","source.inline.script":"step(\'Go to https://elastic.co\', async () => {\\n  await page.goto(\'https://elastic.co\');\\n});","source.project.content":"","synthetics_args":[],"ssl.key":"","ssl.key_passphrase":""}',
          'service.name': '',
          'ssl.certificate': '',
          'ssl.certificate_authorities': '',
          'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
          'ssl.verification_mode': 'full',
          tags: [],
          throttling: PROFILES_MAP[PROFILE_VALUES_ENUM.DEFAULT],
          timeout: null,
          type: 'browser',
          'url.port': null,
          urls: 'https://elastic.co',
        },
        coreMigrationVersion: '8.8.0',
        created_at: '2023-03-31T20:31:24.177Z',
        id: '311cf324-2fc9-4453-9ba5-5e745fd81722',
        references: [],
        type: 'synthetics-monitor',
        typeMigrationVersion: '8.6.0',
        updated_at: '2023-03-31T20:31:24.177Z',
      });
      expect(Object.keys(actual.attributes).some((key: string) => key.includes('zip_url'))).toEqual(
        false
      );
    });

    it.each([browserUptimeUI, browserProject])(
      'removes all top level zip url fields for Uptime and Project monitors',
      (testMonitor) => {
        expect(
          Object.keys(testMonitor.attributes).some((key: string) => key.includes('zip_url'))
        ).toEqual(true);
        const actual = migration880(encryptedSavedObjectsSetup)(testMonitor, context);
        expect(
          Object.keys(actual.attributes).some((key: string) => key.includes('zip_url'))
        ).toEqual(false);
      }
    );

    it('returns the original doc if an error occurs removing zip url fields', () => {
      const invalidTestMonitor = {
        ...browserUI,
        attributes: {
          ...browserUI.attributes,
          name: null,
        },
      };
      // @ts-ignore specifically testing monitors with invalid values
      const actual = migration880(encryptedSavedObjectsSetup)(invalidTestMonitor, context);
      expect(actual).toEqual({
        ...invalidTestMonitor,
        attributes: omit(
          {
            ...invalidTestMonitor.attributes,
            throttling: PROFILES_MAP[PROFILE_VALUES_ENUM.DEFAULT],
          },
          [
            LegacyConfigKey.THROTTLING_CONFIG,
            LegacyConfigKey.IS_THROTTLING_ENABLED,
            LegacyConfigKey.DOWNLOAD_SPEED,
            LegacyConfigKey.UPLOAD_SPEED,
            LegacyConfigKey.LATENCY,
          ]
        ),
      });
    });
  });

  describe('schedule migration', () => {
    it.each(testSchedules)(
      'handles migrating schedule with invalid schedules - browser',
      (previous, migrated) => {
        const testMonitorWithSchedule = {
          ...browserUptimeUI,
          attributes: {
            ...browserUptimeUI.attributes,
            [ConfigKey.SCHEDULE]: {
              unit: ScheduleUnit.MINUTES,
              number: previous,
            },
          },
        };
        expect(
          ALLOWED_SCHEDULES_IN_MINUTES.includes(
            testMonitorWithSchedule.attributes[ConfigKey.SCHEDULE].number
          )
        ).toBe(false);
        const actual = migration880(encryptedSavedObjectsSetup)(testMonitorWithSchedule, context);
        expect(actual.attributes[ConfigKey.SCHEDULE].number).toEqual(migrated);
        expect(
          ALLOWED_SCHEDULES_IN_MINUTES.includes(actual.attributes[ConfigKey.SCHEDULE].number)
        ).toBe(true);
        expect(actual.attributes[ConfigKey.SCHEDULE].unit).toEqual(ScheduleUnit.MINUTES);
      }
    );

    it.each(ALLOWED_SCHEDULES_IN_MINUTES)(
      'handles migrating schedule with valid schedules - browser',
      (validSchedule) => {
        const testMonitorWithSchedule = {
          ...browserUptimeUI,
          attributes: {
            ...browserUptimeUI.attributes,
            [ConfigKey.SCHEDULE]: {
              unit: ScheduleUnit.MINUTES,
              number: validSchedule,
            },
          },
        };
        expect(
          ALLOWED_SCHEDULES_IN_MINUTES.includes(
            testMonitorWithSchedule.attributes[ConfigKey.SCHEDULE].number
          )
        ).toBe(true);
        const actual = migration880(encryptedSavedObjectsSetup)(testMonitorWithSchedule, context);
        expect(actual.attributes[ConfigKey.SCHEDULE].number).toEqual(validSchedule);
        expect(
          ALLOWED_SCHEDULES_IN_MINUTES.includes(actual.attributes[ConfigKey.SCHEDULE].number)
        ).toBe(true);
        expect(actual.attributes[ConfigKey.SCHEDULE].unit).toEqual(ScheduleUnit.MINUTES);
      }
    );

    it.each(ALLOWED_SCHEDULES_IN_MINUTES)(
      'handles migrating schedule with valid schedules - http',
      (validSchedule) => {
        const testMonitorWithSchedule = {
          ...httpUptimeUI,
          attributes: {
            ...httpUptimeUI.attributes,
            [ConfigKey.SCHEDULE]: {
              unit: ScheduleUnit.MINUTES,
              number: validSchedule,
            },
          },
        };
        expect(
          ALLOWED_SCHEDULES_IN_MINUTES.includes(
            testMonitorWithSchedule.attributes[ConfigKey.SCHEDULE].number
          )
        ).toBe(true);
        const actual = migration880(encryptedSavedObjectsSetup)(testMonitorWithSchedule, context);
        expect(actual.attributes[ConfigKey.SCHEDULE].number).toEqual(validSchedule);
        expect(
          ALLOWED_SCHEDULES_IN_MINUTES.includes(actual.attributes[ConfigKey.SCHEDULE].number)
        ).toBe(true);
        expect(actual.attributes[ConfigKey.SCHEDULE].unit).toEqual(ScheduleUnit.MINUTES);
      }
    );

    it.each(ALLOWED_SCHEDULES_IN_MINUTES)(
      'handles migrating schedule with valid schedules - tcp',
      (validSchedule) => {
        const testMonitorWithSchedule = {
          ...tcpUptimeUI,
          attributes: {
            ...tcpUptimeUI.attributes,
            [ConfigKey.SCHEDULE]: {
              unit: ScheduleUnit.MINUTES,
              number: validSchedule,
            },
          },
        };
        expect(
          ALLOWED_SCHEDULES_IN_MINUTES.includes(
            testMonitorWithSchedule.attributes[ConfigKey.SCHEDULE].number
          )
        ).toBe(true);
        const actual = migration880(encryptedSavedObjectsSetup)(testMonitorWithSchedule, context);
        expect(actual.attributes[ConfigKey.SCHEDULE].number).toEqual(validSchedule);
        expect(
          ALLOWED_SCHEDULES_IN_MINUTES.includes(actual.attributes[ConfigKey.SCHEDULE].number)
        ).toBe(true);
        expect(actual.attributes[ConfigKey.SCHEDULE].unit).toEqual(ScheduleUnit.MINUTES);
      }
    );

    it.each(ALLOWED_SCHEDULES_IN_MINUTES)(
      'handles migrating schedule with valid schedules - icmp',
      (validSchedule) => {
        const testMonitorWithSchedule = {
          ...icmpUptimeUI,
          attributes: {
            ...icmpUptimeUI.attributes,
            [ConfigKey.SCHEDULE]: {
              unit: ScheduleUnit.MINUTES,
              number: validSchedule,
            },
          },
        };
        expect(
          ALLOWED_SCHEDULES_IN_MINUTES.includes(
            testMonitorWithSchedule.attributes[ConfigKey.SCHEDULE].number
          )
        ).toBe(true);
        const actual = migration880(encryptedSavedObjectsSetup)(testMonitorWithSchedule, context);
        expect(actual.attributes[ConfigKey.SCHEDULE].number).toEqual(validSchedule);
        expect(
          ALLOWED_SCHEDULES_IN_MINUTES.includes(actual.attributes[ConfigKey.SCHEDULE].number)
        ).toBe(true);
        expect(actual.attributes[ConfigKey.SCHEDULE].unit).toEqual(ScheduleUnit.MINUTES);
      }
    );

    it.each(ALLOWED_SCHEDULES_IN_MINUTES)(
      'handles migrating schedule with valid schedules - project',
      (validSchedule) => {
        const testMonitorWithSchedule = {
          ...browserProject,
          attributes: {
            ...browserProject.attributes,
            [ConfigKey.SCHEDULE]: {
              unit: ScheduleUnit.MINUTES,
              number: validSchedule,
            },
          },
        };
        expect(
          ALLOWED_SCHEDULES_IN_MINUTES.includes(
            testMonitorWithSchedule.attributes[ConfigKey.SCHEDULE].number
          )
        ).toBe(true);
        const actual = migration880(encryptedSavedObjectsSetup)(testMonitorWithSchedule, context);
        expect(actual.attributes[ConfigKey.SCHEDULE].number).toEqual(validSchedule);
        expect(
          ALLOWED_SCHEDULES_IN_MINUTES.includes(actual.attributes[ConfigKey.SCHEDULE].number)
        ).toBe(true);
        expect(actual.attributes[ConfigKey.SCHEDULE].unit).toEqual(ScheduleUnit.MINUTES);
      }
    );

    // handles invalid values stored in saved object
    it.each([null, undefined, {}, []])(
      'handles migrating schedule with invalid values - browser',
      (invalidSchedule) => {
        const testMonitorWithSchedule = {
          ...browserUptimeUI,
          attributes: {
            ...browserUptimeUI.attributes,
            [ConfigKey.SCHEDULE]: {
              unit: ScheduleUnit.MINUTES,
              number: invalidSchedule,
            },
          },
        };
        // @ts-ignore specificially testing monitors with invalid values for full coverage
        const actual = migration880(encryptedSavedObjectsSetup)(testMonitorWithSchedule, context);
        expect(actual.attributes[ConfigKey.SCHEDULE].number).toEqual('1');
        expect(
          ALLOWED_SCHEDULES_IN_MINUTES.includes(actual.attributes[ConfigKey.SCHEDULE].number)
        ).toBe(true);
        expect(actual.attributes[ConfigKey.SCHEDULE].unit).toEqual(ScheduleUnit.MINUTES);
      }
    );

    // handles invalid values stored in saved object
    it.each([
      [5, '5'],
      [4, '3'],
      [2.5, '3'],
    ])('handles migrating schedule numeric values - browser', (invalidSchedule, migrated) => {
      const testMonitorWithSchedule = {
        ...browserUptimeUI,
        attributes: {
          ...browserUptimeUI.attributes,
          [ConfigKey.SCHEDULE]: {
            unit: ScheduleUnit.MINUTES,
            number: invalidSchedule,
          },
        },
      };
      // @ts-ignore specificially testing monitors with invalid values for full coverage
      const actual = migration880(encryptedSavedObjectsSetup)(testMonitorWithSchedule, context);
      expect(actual.attributes[ConfigKey.SCHEDULE].number).toEqual(migrated);
      expect(
        ALLOWED_SCHEDULES_IN_MINUTES.includes(actual.attributes[ConfigKey.SCHEDULE].number)
      ).toBe(true);
      expect(actual.attributes[ConfigKey.SCHEDULE].unit).toEqual(ScheduleUnit.MINUTES);
    });
  });

  describe('throttling migration', () => {
    it('handles migrating with enabled throttling', () => {
      const actual = migration880(encryptedSavedObjectsSetup)(browserUI, context);
      // @ts-ignore
      expect(actual.attributes[ConfigKey.THROTTLING_CONFIG]).toEqual(
        PROFILES_MAP[PROFILE_VALUES_ENUM.DEFAULT]
      );
    });

    it('handles migrating with defined throttling value', () => {
      const testMonitor = {
        ...browserUI,
        attributes: {
          ...browserUI.attributes,
          [LegacyConfigKey.UPLOAD_SPEED]: '0.75',
          [LegacyConfigKey.DOWNLOAD_SPEED]: '9',
          [LegacyConfigKey.LATENCY]: '170',
        },
      };
      const actual = migration880(encryptedSavedObjectsSetup)(testMonitor, context);
      // @ts-ignore
      expect(actual.attributes[ConfigKey.THROTTLING_CONFIG]).toEqual({
        id: '4g',
        label: '4G',
        value: {
          download: '9',
          upload: '0.75',
          latency: '170',
        },
      });
    });

    it('handles migrating with custom throttling value', () => {
      const testMonitor = {
        ...browserUI,
        attributes: {
          ...browserUI.attributes,
          [LegacyConfigKey.UPLOAD_SPEED]: '5',
          [LegacyConfigKey.DOWNLOAD_SPEED]: '10',
          [LegacyConfigKey.LATENCY]: '30',
        },
      };
      const actual = migration880(encryptedSavedObjectsSetup)(testMonitor, context);
      // @ts-ignore
      expect(actual.attributes[ConfigKey.THROTTLING_CONFIG]).toEqual({
        id: 'custom',
        label: 'Custom',
        value: {
          download: '10',
          upload: '5',
          latency: '30',
        },
      });
    });

    it('handles migrating with disabled throttling', () => {
      const testMonitor = {
        ...browserUI,
        attributes: {
          ...browserUI.attributes,
          [LegacyConfigKey.IS_THROTTLING_ENABLED]: false,
        },
      };
      const actual = migration880(encryptedSavedObjectsSetup)(testMonitor, context);
      // @ts-ignore
      expect(actual.attributes[ConfigKey.THROTTLING_CONFIG]).toEqual({
        id: 'no-throttling',
        label: 'No throttling',
        value: null,
      });
    });
  });
});
