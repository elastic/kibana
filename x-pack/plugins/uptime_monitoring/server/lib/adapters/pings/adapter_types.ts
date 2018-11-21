/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMGqlRange, UMPingSortDirectionArg } from '../../../../common/domain_types';
import { Ping, SnapshotHistogram } from '../../../../common/graphql/types';

export interface UMPingsAdapter {
  getAll(request: any, sort?: UMPingSortDirectionArg, size?: number): Promise<Ping[]>;
  getPingHistogram(request: any, range: UMGqlRange): Promise<SnapshotHistogram>;
}
