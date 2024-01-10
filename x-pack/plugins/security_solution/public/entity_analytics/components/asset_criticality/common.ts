/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// SUGGESTION: @tiansivive Move this to some more general place within Entity Analytics
export const buildCriticalityQueryKeys = (id: string) => {
  const ASSET_CRITICALITY = 'ASSET_CRITICALITY';
  const PRIVILEGES = 'PRIVILEGES';
  return {
    doc: [ASSET_CRITICALITY, id],
    privileges: [ASSET_CRITICALITY, PRIVILEGES, id],
  };
};
