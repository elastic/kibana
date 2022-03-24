/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DEPRECATION_TYPE_MAP = {
  cluster_settings: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.clusterDeprecationTypeLabel',
    {
      defaultMessage: 'Cluster',
    }
  ),
  index_settings: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indexDeprecationTypeLabel',
    {
      defaultMessage: 'Index',
    }
  ),
  node_settings: i18n.translate('xpack.upgradeAssistant.esDeprecations.nodeDeprecationTypeLabel', {
    defaultMessage: 'Node',
  }),
  ml_settings: i18n.translate('xpack.upgradeAssistant.esDeprecations.mlDeprecationTypeLabel', {
    defaultMessage: 'Machine Learning',
  }),
};

export const PAGINATION_CONFIG = {
  initialPageSize: 50,
  pageSizeOptions: [50, 100, 200],
};
