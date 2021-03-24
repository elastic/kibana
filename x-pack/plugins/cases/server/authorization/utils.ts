/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { remove, uniq } from 'lodash';
import { nodeBuilder } from '../../../../../src/plugins/data/common';
import { KueryNode } from '../../../../../src/plugins/data/server';

export const getClassFilter = (savedObjectType: string, classNames: string[]): KueryNode => {
  return nodeBuilder.or(
    classNames.reduce<KueryNode[]>((query, className) => {
      ensureFieldIsSafeForQuery('class', className);
      query.push(nodeBuilder.is(`${savedObjectType}.attributes.class`, className));
      return query;
    }, [])
  );
};

export const combineFilterWithAuthorizationFilter = (
  filter: KueryNode,
  authorizationFilter: KueryNode
) => {
  return nodeBuilder.and([filter, authorizationFilter]);
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

export const includeFieldsRequiredForAuthentication = (fields: string[]): string[] =>
  uniq([...fields, 'class']);
