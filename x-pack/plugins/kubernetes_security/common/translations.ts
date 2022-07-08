/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SEARCH_GROUP_CLUSTER = i18n.translate('xpack.kubernetesSecurity.searchGroup.cluster', {
  defaultMessage: 'Cluster',
});

export const SEARCH_GROUP_GROUP_BY = i18n.translate(
  'xpack.kubernetesSecurity.searchGroup.groupBy',
  {
    defaultMessage: 'Group by',
  }
);

export const SEARCH_GROUP_SORT_BY = i18n.translate('xpack.kubernetesSecurity.searchGroup.sortBy', {
  defaultMessage: 'Sort by',
});

export const TREE_VIEW_LOGICAL_VIEW = i18n.translate(
  'xpack.kubernetesSecurity.treeView.logicalView',
  {
    defaultMessage: 'Logical view',
  }
);

export const TREE_VIEW_INFRASTRUCTURE_VIEW = i18n.translate(
  'xpack.kubernetesSecurity.treeView.infrastructureView',
  {
    defaultMessage: 'Infrastructure view',
  }
);

export const TREE_VIEW_SWITCHER_LEGEND = i18n.translate(
  'xpack.kubernetesSecurity.treeView.infrastructureView',
  {
    defaultMessage: 'You can switch between the Logical and Infrastructure view',
  }
);

export const TREE_NAVIGATION_LOADING = i18n.translate(
  'xpack.kubernetesSecurity.treeNavigation.loading',
  {
    defaultMessage: 'Loading',
  }
);
export const TREE_NAVIGATION_SHOW_MORE = (name: string) =>
  i18n.translate('xpack.kubernetesSecurity.treeNavigation.loadMore', {
    values: { name },
    defaultMessage: 'Show more {name}',
  });

export const WIDGET_TOGGLE_SHOW = i18n.translate('xpack.kubernetesSecurity.widgetsToggle.show', {
  defaultMessage: 'Show widgets',
});

export const WIDGET_TOGGLE_HIDE = i18n.translate('xpack.kubernetesSecurity.widgetsToggle.hide', {
  defaultMessage: 'Hide widgets',
});
