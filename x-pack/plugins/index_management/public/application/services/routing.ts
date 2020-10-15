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
  let url = `/edit_template/${encodePathForReactRouter(name)}`;
  if (isLegacy) {
    url = `${url}?legacy=true`;
  }
  return encodeURI(url);
};

export const getTemplateCloneLink = (name: string, isLegacy?: boolean) => {
  let url = `/clone_template/${encodePathForReactRouter(name)}`;
  if (isLegacy) {
    url = `${url}?legacy=true`;
  }
  return encodeURI(url);
};

export const getILMPolicyPath = (policyName: string) => {
  return encodeURI(
    `/data/index_lifecycle_management/policies/edit/${encodeURIComponent(policyName)}`
  );
};

export const getIndexListUri = (filter?: string, includeHiddenIndices?: boolean) => {
  const hiddenIndicesParam =
    typeof includeHiddenIndices !== 'undefined' ? includeHiddenIndices : false;
  if (filter) {
    // React router tries to decode url params but it can't because the browser partially
    // decodes them. So we have to encode both the URL and the filter to get it all to
    // work correctly for filters with URL unsafe characters in them.
    return encodeURI(
      `/indices?includeHiddenIndices=${hiddenIndicesParam}&filter=${encodeURIComponent(filter)}`
    );
  }

  // If no filter, URI is already safe so no need to encode.
  return '/indices';
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
