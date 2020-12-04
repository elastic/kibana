/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MigrationStatus } from './types';

export const isOutdated = ({ current, target }: { current: number; target: number }): boolean =>
  current < target;

export const indexNeedsUpgrade = ({
  status,
  version,
}: {
  status?: MigrationStatus;
  version: number;
}): boolean => !!status && isOutdated({ current: status.version, target: version });

export const signalsNeedUpgrade = ({
  status,
  version,
}: {
  status?: MigrationStatus;
  version: number;
}): boolean =>
  !!status &&
  status.schema_versions.some((schemaVersion) => {
    return (
      schemaVersion.doc_count > 0 && isOutdated({ current: schemaVersion.key, target: version })
    );
  });
