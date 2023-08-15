/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { mergeWith } from 'lodash';
import {
  EncryptedSyntheticsMonitorAttributes,
  ConfigKey,
  EncryptedSyntheticsMonitor,
} from '../../../common/runtime_types';

export function mapSavedObjectToMonitor(so: SavedObject<EncryptedSyntheticsMonitorAttributes>) {
  return Object.assign(so.attributes, { created_at: so.created_at, updated_at: so.updated_at });
}

export function mergeSourceMonitor(
  normalizedPreviousMonitor: EncryptedSyntheticsMonitor,
  monitor: EncryptedSyntheticsMonitor
) {
  return mergeWith(normalizedPreviousMonitor, monitor, customizer);
}

// Ensure that METADATA is merged deeply, to protect AAD and prevent decryption errors
const customizer = (destVal: any, srcValue: any, key: string) => {
  if (key === ConfigKey.ALERT_CONFIG) {
    return { ...destVal, ...srcValue };
  }
  if (key !== ConfigKey.METADATA) {
    return srcValue;
  }
};
