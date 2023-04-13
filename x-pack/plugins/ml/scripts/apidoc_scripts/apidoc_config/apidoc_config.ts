/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';
import { kibanaPackageJson } from '@kbn/repo-info';

export function generateConfig() {
  const apidocConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'apidoc.json'), 'utf8'));
  apidocConfig.version = kibanaPackageJson.version;
  fs.writeFileSync(
    path.resolve(__dirname, '..', 'apidoc_config.json'),
    JSON.stringify(apidocConfig, null, 2)
  );
}
