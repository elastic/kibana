/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { LegacyConfigKey } from '../../../../../../common/constants/monitor_management';
import {
  ConfigKey,
  SyntheticsMonitorWithSecrets,
  MonitorFields,
  BrowserFields,
  ScheduleUnit,
  ThrottlingConfig,
} from '../../../../../../common/runtime_types';
import {
  ALLOWED_SCHEDULES_IN_MINUTES,
  PROFILE_VALUES_ENUM,
  DEFAULT_BROWSER_ADVANCED_FIELDS,
  PROFILES_MAP,
} from '../../../../../../common/constants/monitor_defaults';
import {
  LEGACY_SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
  SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
} from '../../synthetics_monitor';
import { validateMonitor } from '../../../../../routes/monitor_cruds/monitor_validation';
import {
  normalizeMonitorSecretAttributes,
  formatSecrets,
} from '../../../../../synthetics_service/utils/secrets';

export const migration880 = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) => {
  return encryptedSavedObjects.createMigration<
    SyntheticsMonitorWithSecrets,
    SyntheticsMonitorWithSecrets
  >({
    isMigrationNeededPredicate: function shouldBeMigrated(
      doc
    ): doc is SavedObjectUnsanitizedDoc<SyntheticsMonitorWithSecrets> {
      return true;
    },
    migration: (
      doc: SavedObjectUnsanitizedDoc<SyntheticsMonitorWithSecrets>,
      logger
    ): SavedObjectUnsanitizedDoc<SyntheticsMonitorWithSecrets> => {
      let migrated = doc;
      migrated = {
        ...migrated,
        attributes: {
          ...migrated.attributes,
          [ConfigKey.SCHEDULE]: {
            number: getNearestSupportedSchedule(migrated.attributes[ConfigKey.SCHEDULE].number),
            unit: ScheduleUnit.MINUTES,
          },
          [ConfigKey.ALERT_CONFIG]: migrated.attributes[ConfigKey.ALERT_CONFIG] || {
            status: {
              enabled: true,
            },
          },
          // when any action to change a project monitor configuration is taken
          // outside of the synthetics agent cli, we should set the config hash back
          // to an empty string so that the project monitors configuration
          // will be updated on next push
          [ConfigKey.CONFIG_HASH]: '',
        },
      };
      if (migrated.attributes.type === 'browser') {
        try {
          migrated = updateThrottlingFields(migrated);
          const normalizedMonitorAttributes = normalizeMonitorSecretAttributes(migrated.attributes);
          migrated = {
            ...migrated,
            attributes: omitZipUrlFields(normalizedMonitorAttributes as BrowserFields),
          };
        } catch (e) {
          logger.log.warn(
            `Failed to remove ZIP URL fields from legacy Synthetics monitor: ${e.message}`
          );
          return migrated;
        }
      }
      return migrated;
    },
    inputType: LEGACY_SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
    migratedType: SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
  });
};

const getNearestSupportedSchedule = (currentSchedule: string): string => {
  try {
    const closest = ALLOWED_SCHEDULES_IN_MINUTES.reduce(function (prev, curr) {
      const supportedSchedule = parseFloat(curr);
      const currSchedule = parseFloat(currentSchedule);
      const prevSupportedSchedule = parseFloat(prev);
      return Math.abs(supportedSchedule - currSchedule) <
        Math.abs(prevSupportedSchedule - currSchedule)
        ? curr
        : prev;
    });

    return closest;
  } catch {
    return ALLOWED_SCHEDULES_IN_MINUTES[0];
  }
};

const omitZipUrlFields = (fields: BrowserFields) => {
  const metadata = fields[ConfigKey.METADATA];
  const updatedMetadata = omit(metadata || {}, 'is_zip_url_tls_enabled');
  // will return only fields that match the current type defs, which omit
  // zip url fields

  const validationResult = validateMonitor({
    ...fields,
    [ConfigKey.METADATA]: updatedMetadata,
  } as MonitorFields);

  if (!validationResult.valid || !validationResult.decodedMonitor) {
    throw new Error(
      `Monitor is not valid: ${validationResult.reason}. ${validationResult.details}`
    );
  }

  return formatSecrets(validationResult.decodedMonitor);
};

const updateThrottlingFields = (
  doc: SavedObjectUnsanitizedDoc<
    SyntheticsMonitorWithSecrets &
      Partial<{
        [LegacyConfigKey.THROTTLING_CONFIG]: string;
        [LegacyConfigKey.IS_THROTTLING_ENABLED]: boolean;
        [LegacyConfigKey.DOWNLOAD_SPEED]: string;
        [LegacyConfigKey.UPLOAD_SPEED]: string;
        [LegacyConfigKey.LATENCY]: string;
      }>
  >
) => {
  const { attributes } = doc;

  const migrated = {
    ...doc,
    attributes: {
      ...doc.attributes,
      [ConfigKey.CONFIG_HASH]: '',
    },
  };

  const isThrottlingEnabled = attributes[LegacyConfigKey.IS_THROTTLING_ENABLED];
  if (isThrottlingEnabled) {
    const download = String(attributes[LegacyConfigKey.DOWNLOAD_SPEED])!;
    const upload = String(attributes[LegacyConfigKey.UPLOAD_SPEED])!;
    const latency = String(attributes[LegacyConfigKey.LATENCY])!;

    const isDefault = isDefaultThrottlingConfig(download, upload, latency);

    const newThrottlingConfig: ThrottlingConfig = {
      value: {
        download,
        upload,
        latency,
      },
      id: isDefault ? PROFILE_VALUES_ENUM.DEFAULT : 'custom',
      label: isDefault ? 'Default' : `Custom`,
    };

    // @ts-ignore
    migrated.attributes[ConfigKey.THROTTLING_CONFIG] = newThrottlingConfig;
  } else {
    // @ts-ignore
    migrated.attributes[ConfigKey.THROTTLING_CONFIG] =
      PROFILES_MAP[PROFILE_VALUES_ENUM.NO_THROTTLING];
  }

  // filter out legacy throttling fields
  return {
    ...migrated,
    attributes: omit(migrated.attributes, [
      LegacyConfigKey.THROTTLING_CONFIG,
      LegacyConfigKey.IS_THROTTLING_ENABLED,
      LegacyConfigKey.DOWNLOAD_SPEED,
      LegacyConfigKey.UPLOAD_SPEED,
      LegacyConfigKey.LATENCY,
    ]),
  };
};

const isDefaultThrottlingConfig = (download?: string, upload?: string, latency?: string) => {
  const throttling = DEFAULT_BROWSER_ADVANCED_FIELDS.throttling.value;
  return (
    download === throttling?.download &&
    upload === throttling?.upload &&
    latency === throttling?.latency
  );
};
