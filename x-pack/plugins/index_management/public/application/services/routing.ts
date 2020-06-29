/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getTemplateListLink = () => `/templates`;

export const getTemplateDetailsLink = (name: string, isLegacy?: boolean, withHash = false) => {
  const baseUrl = `/templates/${encodePathForReactRouter(name)}`;
  let url = withHash ? `#${baseUrl}` : baseUrl;
  if (isLegacy) {
    url = `${url}?legacy=${isLegacy}`;
  }
  return encodeURI(url);
};

export const getTemplateEditLink = (name: string, isLegacy?: boolean) => {
  return encodeURI(`/edit_template/${encodePathForReactRouter(name)}?legacy=${isLegacy === true}`);
};

export const getTemplateCloneLink = (name: string, isLegacy?: boolean) => {
  return encodeURI(`/clone_template/${encodePathForReactRouter(name)}?legacy=${isLegacy === true}`);
};

export const decodePathFromReactRouter = (pathname: string): string => {
  let decodedPath;
  try {
    decodedPath = decodeURI(pathname);
    decodedPath = decodeURIComponent(decodedPath);
  } catch (_error) {
    decodedPath = decodeURIComponent(pathname);
  }
  return decodeURIComponent(decodedPath);
};

// Need to add some additonal encoding/decoding logic to work with React Router
// For background, see: https://github.com/ReactTraining/history/issues/505
export const encodePathForReactRouter = (pathname: string): string =>
  encodeURIComponent(encodeURIComponent(pathname));
