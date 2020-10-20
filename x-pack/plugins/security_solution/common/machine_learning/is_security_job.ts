/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_GROUP_IDS } from '../constants';

export const isSecurityJob = (job: { groups: string[] }): boolean =>
  job.groups.some((group) => ML_GROUP_IDS.includes(group));
