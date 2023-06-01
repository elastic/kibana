/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESTermSourceDescriptor } from '../../../../../common/descriptor_types';

export function isTermSourceComplete(descriptor: Partial<ESTermSourceDescriptor>) {
  return descriptor.indexPatternId !== undefined && descriptor.term !== undefined;
}
