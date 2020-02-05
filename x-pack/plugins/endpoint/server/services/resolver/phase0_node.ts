/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverPhase0Data } from '../../../common/types';
import { ResolverNode, buildPhase0EntityID } from './common';

export class ResolverPhase0Node implements ResolverNode {
  readonly entityID: string;
  readonly parentEntityID: string;
  constructor(public readonly esData: ResolverPhase0Data) {
    this.entityID = buildPhase0EntityID(esData.agent.id, esData.endgame.unique_pid);
    this.parentEntityID = buildPhase0EntityID(esData.agent.id, esData.endgame.unique_ppid);
  }
}
