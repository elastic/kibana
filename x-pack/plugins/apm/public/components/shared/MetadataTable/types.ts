/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SectionDescriptor {
  key: string;
  label: string;
  required?: boolean;
  properties: Array<{ field: string; value: string[] | number[] }>;
}
