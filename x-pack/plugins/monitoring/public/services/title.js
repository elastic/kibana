/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { DocTitleProvider } from 'ui/doc_title';

const uiModule = uiModules.get('monitoring/title', []);
uiModule.service('title', (Private) => {
  const docTitle = Private(DocTitleProvider);
  return function changeTitle(cluster, suffix) {
    let clusterName = _.get(cluster, 'cluster_name');
    clusterName = (clusterName) ? `- ${clusterName}` : '';
    suffix = (suffix) ? `- ${suffix}` : '';
    docTitle.change(`Monitoring ${clusterName} ${suffix}`, true);
  };
});
