/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { Installation } from '../../../common';
import type { Output } from '../../../common/types';

export const migrateInstallationToV870: SavedObjectMigrationFn<Installation, Installation> = (
  installationDoc
) => {
  installationDoc.attributes.verification_status = 'unknown';

  return installationDoc;
};

export const migrateOutputToV870: SavedObjectMigrationFn<Output, Output> = (
  outputDoc,
  migrationContext
) => {
  if (outputDoc.attributes.shipper) {
    outputDoc.attributes.shipper.disk_queue_enabled = false;
    outputDoc.attributes.shipper.disk_queue_path = '';
    outputDoc.attributes.shipper.disk_queue_max_size = 0;
    outputDoc.attributes.shipper.disk_queue_encryption_enabled = false;
    outputDoc.attributes.shipper.disk_queue_compression_enabled = false;
    outputDoc.attributes.shipper.compression_level = 0;
    outputDoc.attributes.shipper.loadbalance = false;
    outputDoc.attributes.shipper.mem_queue_events = 0;
    outputDoc.attributes.shipper.queue_flush_timeout = 0;
    outputDoc.attributes.shipper.max_batch_bytes = 0;
  }

  return outputDoc;
};
