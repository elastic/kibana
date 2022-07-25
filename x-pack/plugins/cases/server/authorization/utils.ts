/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { remove, uniq } from 'lodash';
import { nodeBuilder, KueryNode } from '@kbn/es-query';
import { OWNER_FIELD } from '../../common/api';

export const getOwnersFilter = (
  savedObjectType: string,
  owners: string[]
): KueryNode | undefined => {
  if (owners.length <= 0) {
    return;
  }

  return nodeBuilder.or(
    owners.reduce<KueryNode[]>((query, owner) => {
      ensureFieldIsSafeForQuery(OWNER_FIELD, owner);
      query.push(nodeBuilder.is(`${savedObjectType}.attributes.${OWNER_FIELD}`, owner));
      return query;
    }, [])
  );
};

export const combineFilterWithAuthorizationFilter = (
  filter?: KueryNode,
  authorizationFilter?: KueryNode
) => {
  if (!filter && !authorizationFilter) {
    return;
  }

  const kueries = [
    ...(filter !== undefined ? [filter] : []),
    ...(authorizationFilter !== undefined ? [authorizationFilter] : []),
  ];
  return nodeBuilder.and(kueries);
};

export const ensureFieldIsSafeForQuery = (field: string, value: string): boolean => {
  const invalid = value.match(/([>=<\*:()]+|\s+)/g);
  if (invalid) {
    const whitespace = remove(invalid, (chars) => chars.trim().length === 0);
    const errors = [];
    if (whitespace.length) {
      errors.push(`whitespace`);
    }
    if (invalid.length) {
      errors.push(`invalid character${invalid.length > 1 ? `s` : ``}: ${invalid?.join(`, `)}`);
    }
    throw new Error(`expected ${field} not to include ${errors.join(' and ')}`);
  }
  return true;
};

export const includeFieldsRequiredForAuthentication = (fields?: string[]): string[] | undefined => {
  if (fields === undefined || fields.length === 0) {
    return;
  }
  return uniq([...fields, OWNER_FIELD]);
};
