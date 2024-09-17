/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EntityTypeDefinition {
  type: string;
  label: string;
  icon: string;
  count: number;
}

export interface EntityDefinition {
  type: string;
  field: string;
  filter?: string;
  index: string[];
}
