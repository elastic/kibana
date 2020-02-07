/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverLegacyData, ResolverPhase1Data, ResolverData } from '../../../common/types';

export const legacyEntityIDDelimiter = '|';
export const legacyEntityPrefix = 'endgame' + legacyEntityIDDelimiter;

export interface ResolverNode {
  entityID: string;
  parentEntityID: string;
  esData: ResolverLegacyData | ResolverPhase1Data;
}

export interface ResolverDataHit {
  _source: ResolverData;
}

export class EntityParseError extends Error {
  constructor(message: string) {
    super(message);
  }

  public static isEntityParseError(e: Error): e is EntityParseError {
    return e instanceof EntityParseError;
  }
}

export function parseLegacyEntityID(entityID: string): { endpointID: string; uniquePID: string } {
  const fields = entityID.split(legacyEntityIDDelimiter);
  if (fields.length !== 3) {
    throw new EntityParseError(
      `Invalid entity_id received, must be
      in the format endgame${legacyEntityIDDelimiter}<endpoint id>${legacyEntityIDDelimiter}<unique_pid>`
    );
  }
  return { endpointID: fields[1], uniquePID: fields[2] };
}

export function isLegacyEntityID(entityID: string) {
  return entityID.startsWith(legacyEntityPrefix);
}

export function buildLegacyEntityID(endpointID: string, uniquePID: number) {
  return legacyEntityPrefix + endpointID + legacyEntityIDDelimiter + uniquePID;
}
