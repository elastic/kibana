/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LEGACY_ML_GROUP_ID, ML_GROUP_ID, ML_GROUP_IDS } from '../constants';

export const isSecurityJob = (job: { groups: string[] }): boolean =>
  job.groups.some((group) =>
    ML_GROUP_IDS.includes(group as typeof ML_GROUP_ID | typeof LEGACY_ML_GROUP_ID)
  );
