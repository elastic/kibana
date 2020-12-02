/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Legacy } from '../legacy_shims';

export function titleProvider($rootScope) {
  return function changeTitle(cluster, suffix) {
    let clusterName = get(cluster, 'cluster_name');
    clusterName = clusterName ? `- ${clusterName}` : '';
    suffix = suffix ? `- ${suffix}` : '';
    $rootScope.$applyAsync(() => {
      Legacy.shims.docTitle.change(
        i18n.translate('xpack.monitoring.stackMonitoringDocTitle', {
          defaultMessage: 'Stack Monitoring {clusterName} {suffix}',
          values: { clusterName, suffix },
        })
      );
    });
  };
}
