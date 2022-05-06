/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PackagePolicy } from '../../types';
export type { Hint } from '../../../common';
export interface ParsedAnnotations {
  host?: string;
  package?: string;
}

export type CreatePackagePolicyResult = PackagePolicy | undefined;
