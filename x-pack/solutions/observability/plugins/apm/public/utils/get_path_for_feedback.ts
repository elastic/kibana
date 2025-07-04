/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const APP_BASE_PATH = '/app';

export const shortenPath = (path: string, pathStart: string) => {
  if (path.startsWith(pathStart)) {
    return path;
  }
  const indexOfPathStart = path.indexOf(pathStart);
  return path.substring(indexOfPathStart);
};

export const getPathForFeedback = (path: string) => {
  const pathStartingFromApp = shortenPath(path, APP_BASE_PATH);
  const pathParts = pathStartingFromApp.split('/');
  const constructPath = `/${pathParts.slice(1, 4).join('/')}`;
  if (pathStartingFromApp === constructPath) {
    return pathStartingFromApp;
  }
  return `${constructPath}*`;
};
