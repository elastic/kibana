/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverPhase1Data } from '../../../common/types';
import { ResolverNode } from './common';

export class ResolverPhase1Node implements ResolverNode {
  readonly entityID: string;
  readonly parentEntityID: string;
  constructor(public readonly esData: ResolverPhase1Data) {
    this.entityID = esData.endpoint.process.entity_id;
    this.parentEntityID = esData.endpoint.process.parent.entity_id;
  }
}
