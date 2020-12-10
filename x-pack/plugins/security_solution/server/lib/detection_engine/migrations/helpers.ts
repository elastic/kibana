/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SignalsMigrationSO } from './saved_objects_schema';
import { MigrationStatus } from './types';

export const isMigrationPending = (migration: SignalsMigrationSO): boolean =>
  migration.attributes.status === 'pending';

export const isMigrationSuccess = (migration: SignalsMigrationSO): boolean =>
  migration.attributes.status === 'success';

export const isMigrationFailed = (migration: SignalsMigrationSO): boolean =>
  migration.attributes.status === 'failure';

export const isOutdated = ({ current, target }: { current: number; target: number }): boolean =>
  current < target;

const mappingsAreOutdated = ({
  status,
  version,
}: {
  status: MigrationStatus;
  version: number;
}): boolean => isOutdated({ current: status.version, target: version });

const signalsAreOutdated = ({
  status,
  version,
}: {
  status: MigrationStatus;
  version: number;
}): boolean =>
  status.signal_versions.some((signalVersion) => {
    return (
      signalVersion.doc_count > 0 && isOutdated({ current: signalVersion.key, target: version })
    );
  });

export const indexIsOutdated = ({
  status,
  version,
}: {
  status?: MigrationStatus;
  version: number;
}): boolean =>
  status != null &&
  (mappingsAreOutdated({ status, version }) || signalsAreOutdated({ status, version }));
