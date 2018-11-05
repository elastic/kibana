/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { Ping } from 'x-pack/plugins/heartbeat/common/graphql/types';
import { HBPingSortDirectionArg } from '../../../../common/domain_types';

export interface HBPingsAdapter {
  getAll(request: Request, sort: HBPingSortDirectionArg, size: number): Promise<Ping[]>;
}
