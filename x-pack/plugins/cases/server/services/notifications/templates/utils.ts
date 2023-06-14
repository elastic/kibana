/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join, resolve } from 'path';

export const getTemplateFilePath = (filePath: string, fileName: string): string => {
  const templatesDir = join('..', 'templates');

  const fileDir = join(templatesDir, filePath);

  const dir = resolve(join(__dirname, fileDir));

  const dataPath = join(dir, fileName);

  if (!dataPath) {
    throw new Error('Error finding the file!');
  }

  return dataPath;
};
