/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { SnapshotType } from '../snapshot';

export const OverviewStatusType = t.type({
  snapshot: SnapshotType,
  disabledIds: t.array(t.string),
  enabledIds: t.array(t.string),
  disabledCount: t.number,
});

export type OverviewStatus = t.TypeOf<typeof OverviewStatusType>;
