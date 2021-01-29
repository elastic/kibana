/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SignalsMigrationSO } from './saved_objects_schema';
import { SignalVersion } from './get_signal_versions_by_index';

export const isMigrationPending = (migration: SignalsMigrationSO): boolean =>
  migration.attributes.status === 'pending';

export const isMigrationSuccess = (migration: SignalsMigrationSO): boolean =>
  migration.attributes.status === 'success';

export const isMigrationFailed = (migration: SignalsMigrationSO): boolean =>
  migration.attributes.status === 'failure';

export const isOutdated = ({ current, target }: { current: number; target: number }): boolean =>
  current < target;

export const signalsAreOutdated = ({
  signalVersions,
  target,
}: {
  signalVersions: SignalVersion[];
  target: number;
}): boolean =>
  signalVersions.some(
    (signalVersion) =>
      signalVersion.count > 0 && isOutdated({ current: signalVersion.version, target })
  );

export const getIsoDateString = () => new Date().toISOString();
