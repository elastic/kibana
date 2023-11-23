/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAPPING_VERSION_DELIMITER = '_';

export const toBenchmarkDocFieldKey = (benchmarkId: string, benchmarkVersion: string) => {
  if (benchmarkVersion.includes(MAPPING_VERSION_DELIMITER))
    return `${benchmarkId};${benchmarkVersion.replaceAll('_', '.')}`;
  return `${benchmarkId};${benchmarkVersion}`;
};

export const toBenchmarkMappingFieldKey = (benchmarkVersion: string) => {
  return `${benchmarkVersion.replaceAll('.', '_')}`;
};
