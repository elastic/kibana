/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BadRequestError } from '../errors/bad_request_error';
import { MigrationDetails, MigrationStatus } from './types';

const decodeBase64 = (base64: string) => Buffer.from(base64, 'base64').toString('utf8');
const encodeBase64 = (utf8: string) => Buffer.from(utf8, 'utf8').toString('base64');

export const encodeMigrationToken = (details: MigrationDetails): string =>
  encodeBase64(JSON.stringify(details));

export const decodeMigrationToken = (token: string): MigrationDetails => {
  try {
    const details = JSON.parse(decodeBase64(token)) as MigrationDetails;

    if (details.destinationIndex == null || details.sourceIndex == null || details.taskId == null) {
      throw new TypeError();
    }

    return details;
  } catch (_) {
    throw new BadRequestError(`An error occurred while decoding the migration token: [${token}]`);
  }
};

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
