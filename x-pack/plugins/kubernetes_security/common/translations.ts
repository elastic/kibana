/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BETA = i18n.translate('xpack.kubernetesSecurity.beta', {
  defaultMessage: 'Beta',
});

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
  'xpack.kubernetesSecurity.treeView.switherLegend',
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

export const TREE_NAVIGATION_COLLAPSE = i18n.translate(
  'xpack.kubernetesSecurity.treeNavigation.collapse',
  {
    defaultMessage: 'Collapse Tree Navigation',
  }
);

export const TREE_NAVIGATION_EXPAND = i18n.translate(
  'xpack.kubernetesSecurity.treeNavigation.expand',
  {
    defaultMessage: 'Expand Tree Navigation',
  }
);

export const CHART_TOGGLE_SHOW = i18n.translate('xpack.kubernetesSecurity.chartsToggle.show', {
  defaultMessage: 'Show charts',
});

export const CHART_TOGGLE_HIDE = i18n.translate('xpack.kubernetesSecurity.chartsToggle.hide', {
  defaultMessage: 'Hide charts',
});

export const COUNT_WIDGET_CLUSTERS = i18n.translate(
  'xpack.kubernetesSecurity.countWidget.clusters',
  {
    defaultMessage: 'Clusters',
  }
);

export const COUNT_WIDGET_NAMESPACE = i18n.translate(
  'xpack.kubernetesSecurity.countWidget.namespace',
  {
    defaultMessage: 'Namespace',
  }
);

export const COUNT_WIDGET_NODES = i18n.translate('xpack.kubernetesSecurity.countWidget.nodes', {
  defaultMessage: 'Nodes',
});

export const COUNT_WIDGET_PODS = i18n.translate('xpack.kubernetesSecurity.countWidget.pods', {
  defaultMessage: 'Pods',
});

export const COUNT_WIDGET_CONTAINER_IMAGES = i18n.translate(
  'xpack.kubernetesSecurity.countWidget.containerImages',
  {
    defaultMessage: 'Container Images',
  }
);

export const CONTAINER_NAME_SESSION = i18n.translate(
  'xpack.kubernetesSecurity.containerNameWidget.containerImage',
  {
    defaultMessage: 'Container images',
  }
);

export const CONTAINER_NAME_SESSION_COUNT_COLUMN = i18n.translate(
  'xpack.kubernetesSecurity.containerNameWidget.containerImageCountColumn',
  {
    defaultMessage: 'Session count',
  }
);

export const CONTAINER_NAME_SESSION_ARIA_LABEL = i18n.translate(
  'xpack.kubernetesSecurity.containerNameWidget.containerImageAriaLabel',
  {
    defaultMessage: 'Container Name Session Widget',
  }
);
