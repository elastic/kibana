/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilitySharedPlugin } from './plugin';
export type {
  ObservabilitySharedPlugin,
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from './plugin';

export type {
  ObservabilityPageTemplateProps,
  LazyObservabilityPageTemplateProps,
} from './components/page_template/page_template';

export type { NavigationEntry } from './components/page_template/page_template';

export {
  type ObservabilityActionContextMenuItemProps,
  getContextMenuItemsFromActions,
} from './services/get_context_menu_items_from_actions';

export { useObservabilityTourContext } from './components/tour';

export const plugin = () => {
  return new ObservabilitySharedPlugin();
};

export {
  observabilityFeatureId,
  observabilityAppId,
  casesFeatureId,
  sloFeatureId,
} from '../common';
