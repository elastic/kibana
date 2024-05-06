/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const buildIndexPatternRegExp = (basePatterns: string[]) => {
  // Create the base patterns union with strict boundaries
  const basePatternGroup = `\\b(${basePatterns.join('|')})\\b([^,\\s]+)?`;
  // Apply base patterns union for local and remote clusters
  const localAndRemotePatternGroup = `((${basePatternGroup})|([^:,\\s]+:${basePatternGroup}))`;
  // Handle trailing comma and multiple pattern concatenation
  return new RegExp(`^${localAndRemotePatternGroup}(,${localAndRemotePatternGroup})*(,$|$)`, 'i');
};
