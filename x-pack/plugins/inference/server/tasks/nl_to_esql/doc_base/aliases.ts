/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Sometimes the LLM request documentation by wrongly naming the command.
 * This is mostly for the case for STATS.
 */
const aliases: Record<string, string[]> = {
  STATS: ['STATS_BY', 'BY', 'STATS...BY'],
};

const getAliasMap = () => {
  return Object.entries(aliases).reduce<Record<string, string>>(
    (aliasMap, [command, commandAliases]) => {
      commandAliases.forEach((alias) => {
        aliasMap[alias] = command;
      });
      return aliasMap;
    },
    {}
  );
};

const aliasMap = getAliasMap();

export const tryResolveAlias = (maybeAlias: string): string => {
  return aliasMap[maybeAlias] ?? maybeAlias;
};
