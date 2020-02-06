/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverPhase0Data, ResolverPhase1Data, ResolverData } from '../../../common/types';

export const phase0EntityIDDelimiter = '|';
export const phase0EntityPrefix = 'endgame' + phase0EntityIDDelimiter;

export interface ResolverNode {
  entityID: string;
  parentEntityID: string;
  esData: ResolverPhase0Data | ResolverPhase1Data;
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

/**
 * Defines a type for arbitrary elasticsearch query json objects
 */
export interface Query {
  [key: string]: number | string | null | undefined | Query | Query[];
}

export function parsePhase0EntityID(entityID: string): { endpointID: string; uniquePID: string } {
  const fields = entityID.split(phase0EntityIDDelimiter);
  if (fields.length !== 3) {
    throw new EntityParseError(
      `Invalid entity_id received, must be in the format endgame${phase0EntityIDDelimiter}<endpoint id>${phase0EntityIDDelimiter}<unique_pid>`
    );
  }
  return { endpointID: fields[1], uniquePID: fields[2] };
}

export function isPhase0EntityID(entityID: string) {
  return entityID.includes(phase0EntityPrefix);
}

export function buildPhase0EntityID(endpointID: string, uniquePID: number) {
  return phase0EntityPrefix + endpointID + phase0EntityIDDelimiter + uniquePID;
}
