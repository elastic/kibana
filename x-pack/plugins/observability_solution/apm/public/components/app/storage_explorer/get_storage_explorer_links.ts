/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core-lifecycle-browser';

export function getIndexManagementHref(core: CoreStart, dataStream?: string) {
  const indexManagementPath = '/data/index_management/data_streams';
  return core.application.getUrlForApp('management', {
    path: dataStream ? `${indexManagementPath}/${dataStream}?isDeepLink=true` : indexManagementPath,
  });
}

export function getStorageExplorerFeedbackHref() {
  return 'https://ela.st/feedback-storage-explorer';
}

export function getKibanaAdvancedSettingsHref(core: CoreStart) {
  return core.application.getUrlForApp('management', {
    path: '/kibana/settings?query=category:(observability)',
  });
}
