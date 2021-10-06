/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyArtifact } from '../types';
import { TrustedApp } from '../../../../../common/endpoint/types';

/**
 * Type guard for `AnyArtifact` to check if it is a trusted app entry
 * @param item
 */
export const isTrustedApp = (item: AnyArtifact): item is TrustedApp => {
  return 'effectScope' in item;
};
