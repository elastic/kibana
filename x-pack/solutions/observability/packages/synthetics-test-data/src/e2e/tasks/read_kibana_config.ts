/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { REPO_ROOT } from '@kbn/repo-info';

export type KibanaConfig = ReturnType<typeof readKibanaConfig>;

export const readKibanaConfig = () => {
  const kibanaConfigDir = `${REPO_ROOT}/config`;
  const kibanaDevConfig = path.join(kibanaConfigDir, 'kibana.dev.yml');
  const kibanaConfig = path.join(kibanaConfigDir, 'kibana.yml');

  return (yaml.load(
    fs.readFileSync(fs.existsSync(kibanaDevConfig) ? kibanaDevConfig : kibanaConfig, 'utf8')
  ) || {}) as Record<string, string>;
};
