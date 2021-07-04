/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_IMMUTABLE_KEY } from '../../../../../common/constants';
import { FilterOptions } from './types';

/**
 * Convert rules filter options object to KQL query
 *
 * @param filterOptions desired filters (e.g. filter/sortField/sortOrder)
 *
 * @returns KQL string
 */
export const convertRulesFilterToKQL = (filterOptions: FilterOptions): string => {
  const showCustomRuleFilter = filterOptions.showCustomRules
    ? [`alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:false"`]
    : [];
  const showElasticRuleFilter = filterOptions.showElasticRules
    ? [`alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:true"`]
    : [];
  const filtersWithoutTags = [
    ...(filterOptions.filter.length ? [`alert.attributes.name: ${filterOptions.filter}`] : []),
    ...showCustomRuleFilter,
    ...showElasticRuleFilter,
  ].join(' AND ');

  const tags = filterOptions.tags
    .map((t) => `alert.attributes.tags: "${t.replace(/"/g, '\\"')}"`)
    .join(' AND ');

  const filterString =
    filtersWithoutTags !== '' && tags !== ''
      ? `${filtersWithoutTags} AND (${tags})`
      : filtersWithoutTags + tags;

  return filterString;
};
