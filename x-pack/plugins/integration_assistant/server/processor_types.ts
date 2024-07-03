/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface KVProcessor {
  kv: KVMap;
}

interface KVMap {
  field: string;
  target_field: string;
  tag?: string;
  value_split: string;
  field_split: string;
  ignore_missing?: boolean;
  ignore_failure?: boolean;
}
