/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path, { join, resolve } from 'path';

export const getDataPath = (filePath: string, fileName: string): string => {
    const dir = resolve(join(__dirname, filePath));
  
    const dataPath = path.join(dir, fileName);

    return dataPath ?? '';
}
