/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRandomString, getRandomNumber } from '@kbn/test-jest-helpers';
import { SlmPolicy } from '../../common/types';
import { DEFAULT_POLICY_SCHEDULE } from '../../public/application/constants';

const dateNow = new Date();
const randomModifiedDateMillis = new Date().setDate(dateNow.getDate() - 1);
const randomExecutionDateMillis = new Date().setDate(dateNow.getDate() + 1);

const DEFAULT_STATS: SlmPolicy['stats'] = {
  snapshotsTaken: 0,
  snapshotsFailed: 0,
  snapshotsDeleted: 0,
  snapshotDeletionFailures: 0,
};

export const getPolicy = ({
  name = `policy-${getRandomString()}`,
  config = {},
  modifiedDate = new Date(randomModifiedDateMillis).toString(),
  modifiedDateMillis = randomModifiedDateMillis,
  nextExecution = new Date(randomExecutionDateMillis).toString(),
  nextExecutionMillis = randomExecutionDateMillis,
  repository = `repo-${getRandomString()}`,
  retention = {},
  schedule = DEFAULT_POLICY_SCHEDULE,
  snapshotName = `snapshot-${getRandomString()}`,
  stats = DEFAULT_STATS,
  version = getRandomNumber(),
  isManagedPolicy = false,
}: Partial<SlmPolicy> = {}): SlmPolicy => ({
  name,
  config,
  modifiedDate,
  modifiedDateMillis,
  nextExecution,
  nextExecutionMillis,
  repository,
  retention,
  schedule,
  snapshotName,
  stats,
  version,
  isManagedPolicy,
});
