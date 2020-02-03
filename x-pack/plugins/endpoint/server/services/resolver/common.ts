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
  parentEntityID: string;
  esData: ResolverPhase0Data | ResolverPhase1Data;
}

export function parsePhase0EntityID(entityID: string): [string, string] {
  const fields = entityID.split('-');
  if (fields.length !== 3) {
    throw Error(
      'Invalid entity_id received, must be in the format endgame-<endpoint id>-<unique_pid>'
    );
  }
  return [fields[1], fields[2]];
}

export function isPhase0EntityID(entityID: string) {
  return entityID.includes(phase0EntityPrefix);
}
