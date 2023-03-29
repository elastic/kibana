/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import {
  ConfigKey,
  SyntheticsMonitorWithSecrets,
  MonitorFields,
  BrowserFields,
} from '../../../../../../common/runtime_types';
import {
  LEGACY_SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
  SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
} from '../../synthetics_monitor';
import { validateMonitor } from '../../../../../routes/monitor_cruds/monitor_validation';
import { normalizeSecrets, formatSecrets } from '../../../../../synthetics_service/utils/secrets';

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
      doc: SavedObjectUnsanitizedDoc<SyntheticsMonitorWithSecrets>
    ): SavedObjectUnsanitizedDoc<SyntheticsMonitorWithSecrets> => {
      const normalizedDoc = normalizeSecrets(doc);
      if (normalizedDoc.attributes.type === 'browser') {
        return {
          ...doc,
          attributes: omitZipUrlFields(normalizedDoc.attributes as BrowserFields),
        };
      }
      return doc;
    },
    inputType: LEGACY_SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
    migratedType: SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
  });
};

const getNearestSupportedSchedule = (currentSchedule: string): string => {
  const counts = ['4', '9', '15', '6', '2'];

  const closest = counts.reduce(function (prev, curr) {
    const supportedSchedule = parseInt(curr, 10);
    const currSchedule = parseInt(currentSchedule, 10);
    const prevSupportedSchedule = parseInt(prev, 10);
    return Math.abs(supportedSchedule - currSchedule) <
      Math.abs(prevSupportedSchedule - currSchedule)
      ? curr
      : prev;
  });

  return closest;
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
    throw new Error('Monitor is not valid');
  }

  return formatSecrets(validationResult.decodedMonitor);
};
