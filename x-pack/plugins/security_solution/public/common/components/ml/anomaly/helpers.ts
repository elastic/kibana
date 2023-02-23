/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * From version 8.8, jobs installed using security solution have the spaceId in their name.
 */
export const matchJobId = (jobId: string, moduleJobId: string, spaceId: string | undefined) =>
  jobId === uninstalledJobIdToInstalledJobId(moduleJobId, spaceId) || jobId === moduleJobId;

export const installedJobPrefix = (spaceId: string | undefined) => `${spaceId ?? 'default'}_`;

export const uninstalledJobIdToInstalledJobId = (
  moduleJobId: string,
  spaceId: string | undefined
) => `${installedJobPrefix(spaceId)}${moduleJobId}`;
