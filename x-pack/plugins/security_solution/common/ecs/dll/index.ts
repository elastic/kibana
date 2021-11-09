/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CodeSignature } from '../file';
import { ProcessPe } from '../process';

export interface DllEcs {
  path?: string;
  code_signature?: CodeSignature;
  pe?: ProcessPe;
}
