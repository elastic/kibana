/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityHasPrivilegesPrivileges } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { AlwaysShowPattern, ElasticsearchIndex } from '../../../../common/types/indices';

export const getAlwaysShowAliases = (indexAndAliasNames: string[], alwaysShowNames: string[]) => {
  if (alwaysShowNames.length === 0) return [];
  // Only add the index and aliases that are not already included
  return alwaysShowNames.filter((name) => !indexAndAliasNames.includes(name));
};

export const expandAliases = (
  indexName: string,
  aliases: string[],
  index: Omit<ElasticsearchIndex, 'name' | 'aliases' | 'count'>,
  indicesData: {
    indexCounts: Record<string, number>;
    indexPrivileges: Record<string, SecurityHasPrivilegesPrivileges>;
  },
  alwaysShowPattern?: AlwaysShowPattern
) => {
  const filteredAliases = alwaysShowPattern
    ? aliases.filter((alias) => alias.startsWith(alwaysShowPattern.alias_pattern))
    : aliases;
  return filteredAliases.map((alias) => ({
    alias: true,
    count: indicesData.indexCounts[alias] ?? 0,
    name: alias,
    privileges: { manage: false, read: false, ...indicesData.indexPrivileges[indexName] },
    ...index,
  }));
};
