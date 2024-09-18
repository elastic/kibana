/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Query } from '@kbn/es-query';
import type { Group } from '../../../../common/typings';

export const getGroupQueries = (tags?: string[], groups?: Group[]): Query[] | undefined => {
  const tagKueries: string[] =
    tags?.map((tag) => {
      return `tags: ${tag}`;
    }) ?? [];
  const groupKueries =
    (groups &&
      groups.map(({ field, value }) => {
        return `${[field]}: ${value} or kibana.alert.group.value: ${value}`;
      })) ??
    [];

  const kueries = [...tagKueries, ...groupKueries];

  return kueries.length
    ? [
        {
          query: kueries.join(' or '),
          language: 'kuery',
        },
      ]
    : undefined;
};
