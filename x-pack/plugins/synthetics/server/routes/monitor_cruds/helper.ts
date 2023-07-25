/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { EncryptedSyntheticsMonitorAttributes } from '../../../common/runtime_types';

export function mapSavedObjectToMonitor(so: SavedObject<EncryptedSyntheticsMonitorAttributes>) {
  return Object.assign(so.attributes, { created_at: so.created_at, updated_at: so.updated_at });
}
