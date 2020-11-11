/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getTemplateListLink = () => `/templates`;

export const getTemplateDetailsLink = (name: string, isLegacy?: boolean) => {
  let url = `/templates/${encodeURIComponent(name)}`;
  if (isLegacy) {
    url = `${url}?legacy=${isLegacy}`;
  }
  return encodeURI(url);
};

export const getTemplateEditLink = (name: string, isLegacy?: boolean) => {
  let url = `/edit_template/${encodeURIComponent(name)}`;
  if (isLegacy) {
    url = `${url}?legacy=true`;
  }
  return encodeURI(url);
};

export const getTemplateCloneLink = (name: string, isLegacy?: boolean) => {
  let url = `/clone_template/${encodeURIComponent(name)}`;
  if (isLegacy) {
    url = `${url}?legacy=true`;
  }
  return encodeURI(url);
};

export const getILMPolicyPath = (policyName: string) => {
  return `/data/index_lifecycle_management/policies/edit/${encodeURIComponent(policyName)}`;
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

export const getDataStreamDetailsLink = (name: string) => {
  return encodeURI(`/data_streams/${encodeURIComponent(name)}`);
};
