/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { phase0EntityPrefix } from 'common';
import { ResolverPhase0Data } from '../../common/types';
import { ResolverNode } from './common';

export class ResolverPhase0Node implements ResolverNode {
  readonly entityID: string;
  readonly parentEntityID: string;
  constructor(public readonly esData: ResolverPhase0Data) {
    this.entityID = `${phase0EntityPrefix}${esData.labels.endpoint_id}-${esData.endgame.unique_pid}`;
    this.parentEntityID = `${phase0EntityPrefix}${esData.labels.endpoint_id}-${esData.endgame.unique_ppid}`;
  }
}
