/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LinkPanelListItem } from '.';

export const isLinkPanelListItem = (
  item: LinkPanelListItem | Partial<LinkPanelListItem>
): item is LinkPanelListItem =>
  typeof item.title === 'string' && typeof item.path === 'string' && typeof item.count === 'number';

export interface EventCounts {
  [key: string]: number;
}
