/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Names the cluster-wide lock held for the whole extraction of one repository. */
export const extractionLockId = (repository: string): string =>
  `code_intelligence_extraction:${repository}`;
