/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import ss from 'stream-stream';
import { getPluginPaths } from './get_plugin_paths';

export const getPluginStream = type => {
  const stream = ss({
    separator: '\n',
  });

  getPluginPaths(type).then(files => {
    files.forEach(file => {
      stream.write(fs.createReadStream(file));
    });
    stream.end();
  });

  return stream;
};
