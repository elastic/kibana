/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export interface MemoryProtection {
  cross_session?: boolean;
  feature?: string;
  parent_to_child?: boolean;
  self_injection?: boolean;
  unique_key_v1?: string;
}
