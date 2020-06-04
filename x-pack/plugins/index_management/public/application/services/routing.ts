/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getTemplateListLink = () => `/templates`;

// Need to add some additonal encoding/decoding logic to work with React Router
// For background, see: https://github.com/ReactTraining/history/issues/505
export const getTemplateDetailsLink = (name: string, isLegacy?: boolean, withHash = false) => {
  const baseUrl = `/templates/${encodeURIComponent(encodeURIComponent(name))}`;
  let url = withHash ? `#${baseUrl}` : baseUrl;
  if (isLegacy) {
    url = `${url}?legacy=${isLegacy}`;
  }
  return encodeURI(url);
};

export const getTemplateEditLink = (name: string, isLegacy?: boolean) => {
  return encodeURI(
    `/edit_template/${encodeURIComponent(encodeURIComponent(name))}?legacy=${isLegacy === true}`
  );
};

export const getTemplateCloneLink = (name: string, isLegacy?: boolean) => {
  return encodeURI(
    `/clone_template/${encodeURIComponent(encodeURIComponent(name))}?legacy=${isLegacy === true}`
  );
};

export const decodePath = (pathname: string): string => {
  let decodedPath;
  try {
    decodedPath = decodeURI(pathname);
    decodedPath = decodeURIComponent(decodedPath);
  } catch (_error) {
    decodedPath = decodeURIComponent(pathname);
  }
  return decodeURIComponent(decodedPath);
};
