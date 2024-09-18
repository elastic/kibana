/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Group } from '../../../../common/typings';

export interface Query {
  query: string;
  language: string;
}

export const getGroupQueries = (tags?: string[], groups?: Group[]): Query[] | undefined => {
  const tagKueries: string[] =
    tags?.map((tag) => {
      return `tags: ${tag}`;
    }) ?? [];
  const groupKueries =
    (groups &&
      groups.map(({ field, value }) => {
        return `(${[field]}: ${value} or kibana.alert.group.value: ${value})`;
      })) ??
    [];

  const tagKueriesStr = tagKueries.length > 0 ? [`(${tagKueries.join(' or ')})`] : [];
  const groupKueriesStr = groupKueries.length > 0 ? [`${groupKueries.join(' or ')}`] : [];
  const kueries = [...tagKueriesStr, ...groupKueriesStr];

  return kueries.length
    ? [
        {
          query: kueries.join(' or '),
          language: 'kuery',
        },
      ]
    : undefined;
};
