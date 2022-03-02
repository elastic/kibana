/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESUpgradeStatus } from '../../../../common/types';

export const esCriticalAndWarningDeprecations: ESUpgradeStatus = {
  totalCriticalDeprecations: 1,
  deprecations: [
    {
      isCritical: true,
      type: 'cluster_settings',
      resolveDuringUpgrade: false,
      message: 'Index Lifecycle Management poll interval is set too low',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html#ilm-poll-interval-limit',
      details:
        'The Index Lifecycle Management poll interval setting [indices.lifecycle.poll_interval] is currently set to [500ms], but must be 1s or greater',
    },
    {
      isCritical: false,
      type: 'index_settings',
      resolveDuringUpgrade: false,
      message: 'Translog retention settings are deprecated',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-translog.html',
      details:
        'translog retention settings [index.translog.retention.size] and [index.translog.retention.age] are ignored because translog is no longer used in peer recoveries with soft-deletes enabled (default in 7.0 or later)',
      index: 'settings',
    },
  ],
};

export const esCriticalOnlyDeprecations: ESUpgradeStatus = {
  totalCriticalDeprecations: 1,
  deprecations: [
    {
      isCritical: true,
      type: 'cluster_settings',
      resolveDuringUpgrade: false,
      message: 'Index Lifecycle Management poll interval is set too low',
      url: 'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html#ilm-poll-interval-limit',
      details:
        'The Index Lifecycle Management poll interval setting [indices.lifecycle.poll_interval] is currently set to [500ms], but must be 1s or greater',
    },
  ],
};

export const esNoDeprecations: ESUpgradeStatus = {
  totalCriticalDeprecations: 0,
  deprecations: [],
};
