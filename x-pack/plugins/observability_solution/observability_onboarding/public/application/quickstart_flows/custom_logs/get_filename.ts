/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getFilename = (path?: string) => {
  if (!path) {
    return '';
  }

  const filenameWithExt = path.replace(/^.*[\\\/](?!\d*$)/g, '');
  const filenameParts = filenameWithExt.split('.');

  return replaceSpecialChars(filenameParts[0]);
};

export const replaceSpecialChars = (filename: string) =>
  filename.replaceAll(/[^a-zA-Z0-9_]/g, '_');
