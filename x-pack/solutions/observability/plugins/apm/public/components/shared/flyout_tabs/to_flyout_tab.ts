/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { FlyoutTabProps } from '@kbn/flyout-template';

/** A tab in the `EuiTabbedContent` shape, as returned by the shared tab content getters. */
export type TabbedContentTab = Omit<FlyoutTabProps, 'id' | 'label'> & {
  id: string;
  name: ReactNode;
  content: ReactNode;
};

/** A `FlyoutTemplate` root tab paired with the content of its `Body.TabPanel`. */
export interface FlyoutTab {
  tab: FlyoutTabProps;
  panel: ReactNode;
}

export function toFlyoutTab({ name, content, ...tab }: TabbedContentTab): FlyoutTab {
  return { tab: { ...tab, label: name }, panel: content };
}
