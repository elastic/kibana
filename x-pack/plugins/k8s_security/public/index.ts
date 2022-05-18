/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { K8sSecurityPlugin } from './plugin';

export type { K8sSecurityStart } from './types';

export function plugin() {
  return new K8sSecurityPlugin();
}
