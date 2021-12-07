/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Args {
  basePath: string;
  appPath: string;
  spaceId?: string;
}

export const buildKibanaPath = ({ basePath, appPath, spaceId }: Args) => {
  return spaceId === undefined || spaceId.toLowerCase() === 'default'
    ? `${basePath}${appPath}`
    : `${basePath}/s/${spaceId}${appPath}`;
};
