/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ID } from './constants';
import { LensMarkdownNode } from './types';

export const isLensMarkdownNode = (node?: unknown): node is LensMarkdownNode => {
  const unsafeNode = node as LensMarkdownNode;
  return (
    unsafeNode != null &&
    unsafeNode.timeRange != null &&
    unsafeNode.attributes != null &&
    unsafeNode.type === LENS_ID
  );
};
