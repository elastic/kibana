/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IndexTemplateFormatVersion } from '../../../common';

export const getTemplateListLink = () => {
  return `/templates`;
};

// Need to add some additonal encoding/decoding logic to work with React Router
// For background, see: https://github.com/ReactTraining/history/issues/505
export const getTemplateDetailsLink = (
  name: string,
  formatVersion: IndexTemplateFormatVersion,
  withHash = false
) => {
  const baseUrl = `/templates/${encodeURIComponent(encodeURIComponent(name))}?v=${formatVersion}`;
  const url = withHash ? `#${baseUrl}` : baseUrl;
  return encodeURI(url);
};

export const getTemplateEditLink = (name: string, formatVersion: IndexTemplateFormatVersion) => {
  return encodeURI(
    `/edit_template/${encodeURIComponent(encodeURIComponent(name))}?v=${formatVersion}`
  );
};

export const getTemplateCloneLink = (name: string, formatVersion: IndexTemplateFormatVersion) => {
  return encodeURI(
    `/clone_template/${encodeURIComponent(encodeURIComponent(name))}?v=${formatVersion}`
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
