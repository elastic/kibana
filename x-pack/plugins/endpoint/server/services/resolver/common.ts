/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverPhase0Data } from '../../common/types';
import { ResolverPhase1Data } from '../../common/types';
export const phase0EntityPrefix = 'endgame-';

export interface ResolverNode {
  entityID: string;
  esData: ResolverPhase0Data | ResolverPhase1Data;
}
