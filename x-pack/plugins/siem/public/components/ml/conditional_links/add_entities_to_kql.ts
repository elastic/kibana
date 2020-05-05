/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RisonValue, encode } from 'rison-node';
import { decodeRison, isRisonObject, isRegularString } from './rison_helpers';

export const entityToKql = (entityNames: string[], entity: string): string => {
  if (entityNames.length === 1) {
    return `${entityNames[0]}: "${entity}"`;
  } else {
    return entityNames.reduce((accum, entityName, index, array) => {
      if (index === 0) {
        return `(${entityName}: "${entity}"`;
      } else if (index === array.length - 1) {
        return `${accum} or ${entityName}: "${entity}")`;
      } else {
        return `${accum} or ${entityName}: "${entity}"`;
      }
    }, '');
  }
};

export const entitiesToKql = (entityNames: string[], entities: string[]): string => {
  return entities.reduce((accum, entity, index) => {
    const entityKql = entityToKql(entityNames, entity);
    if (index === 0) {
      return entityKql;
    } else {
      return `${accum} or ${entityKql}`;
    }
  }, '');
};

export const addEntitiesToKql = (
  entityNames: string[],
  entities: string[],
  kqlQuery: string
): string => {
  const value: RisonValue = decodeRison(kqlQuery);
  if (isRisonObject(value)) {
    const appQuery = value;
    if (isRisonObject(appQuery)) {
      if (isRegularString(appQuery.query)) {
        const entitiesKql = entitiesToKql(entityNames, entities);
        if (appQuery.query !== '' && entitiesKql !== '') {
          appQuery.query = `(${entitiesKql}) and (${appQuery.query})`;
        } else if (appQuery.query === '' && entitiesKql !== '') {
          appQuery.query = `(${entitiesKql})`;
        }
        return encode(value);
      }
    }
  } else if (value == null) {
    const entitiesKql = entitiesToKql(entityNames, entities);
    return encode({ query: `(${entitiesKql})`, language: 'kuery' });
  }
  return kqlQuery;
};
