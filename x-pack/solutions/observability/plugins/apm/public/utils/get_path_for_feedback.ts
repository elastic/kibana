/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const APP_BASE_PATH = '/app';

const shortenPath = (path: string, pathStart: string) => {
  if (path.startsWith(pathStart)) {
    return path;
  }
  const indexOfPathStart = path.indexOf(pathStart);
  return path.substring(indexOfPathStart);
};

export const getPathForFeedback = (path: string) => {
  // We have seem some instances where path can be undefined at this point https://github.com/elastic/kibana/issues/254202
  // We're falling back to the a generic apm app path to avoid crashing at still direct the feedback towards the APM plugin
  const sanitizedPath = typeof path !== 'string' ? '/app/apm' : path;
  const pathStartingFromApp = shortenPath(sanitizedPath, APP_BASE_PATH);
  const pathParts = pathStartingFromApp.split('/');
  const constructPath = `/${pathParts.slice(1, 4).join('/')}`;
  if (pathStartingFromApp === constructPath) {
    return pathStartingFromApp;
  }
  return `${constructPath}*`;
};
