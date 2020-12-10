/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import { fold } from 'fp-ts/lib/Either';

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

export const getIsoDateString = () => new Date().toISOString();

export const toPromise = async <E, A>(taskEither: TaskEither<E, A>): Promise<A> =>
  pipe(
    await taskEither(),
    fold(
      (e) => Promise.reject(e),
      (a) => Promise.resolve(a)
    )
  );

export const toError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));
