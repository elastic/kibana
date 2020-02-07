/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverLegacyData } from '../../../common/types';
import { ResolverNode, buildLegacyEntityID } from './common';

export class ResolverLegacyNode implements ResolverNode {
  readonly entityID: string;
  readonly parentEntityID: string;
  constructor(public readonly esData: ResolverLegacyData) {
    this.entityID = buildLegacyEntityID(esData.agent.id, esData.endgame.unique_pid);
    this.parentEntityID = buildLegacyEntityID(esData.agent.id, esData.endgame.unique_ppid);
  }
}
