/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMELINE_ID } from './parser';
import { TimelineMarkdownNode } from './types';

export const isTimelineMarkdownNode = (node?: unknown): node is TimelineMarkdownNode => {
  const unsafeNode = node as TimelineMarkdownNode;

  return (
    unsafeNode != null &&
    unsafeNode.title != null &&
    unsafeNode.url != null &&
    unsafeNode.type === TIMELINE_ID
  );
};
