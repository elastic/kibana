/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ElementSpec {
  name: string;
  image: string;
  expression: string;
  displayName?: string;
  tags?: string[];
  help?: string;
  filter?: string;
  width?: number;
  height?: number;
}

export type ElementFactory = () => ElementSpec;
