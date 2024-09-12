/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { migrateAlertPageControlsTo816 } from '../timelines/containers/local_storage/migrate_alert_page_controls';

type LocalStorageMigrator = (storage: Storage) => void;

const runLocalStorageMigration = (fn: LocalStorageMigrator) => {
  const storage = new Storage(localStorage);
  fn(storage);
};

export const runDetectionMigrations = () => {
  runLocalStorageMigration(migrateAlertPageControlsTo816);
};
