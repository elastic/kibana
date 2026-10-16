/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync } from 'fs';
import { parseEnv } from 'util';

export default function consumeState(path) {
  if (!existsSync(path)) {
    return undefined;
  } else {
    process.loadEnvFile(path);
    return parseEnv(readFileSync(path, 'utf8'));
  }
}
