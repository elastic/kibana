/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { prefixIndexPattern } from '../ccs_utils';
import { INDEX_PATTERN_FILEBEAT, INFRA_SOURCE_ID } from '../../../common/constants';

export const initInfraSource = server => {
  const infraPlugin = server.plugins.infra;

  if (infraPlugin) {
    const config = server.config();
    const filebeatIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_FILEBEAT, '*');
    infraPlugin.defineInternalSourceConfiguration(INFRA_SOURCE_ID, {
      name: 'Elastic Stack Logs',
      logAlias: filebeatIndexPattern,
      logColumns: [
        {
          timestampColumn: {
            id: '5e7f964a-be8a-40d8-88d2-fbcfbdca0e2f',
          },
        },
        {
          messageColumn: {
            id: 'b645d6da-824b-4723-9a2a-e8cece1645c0',
          },
        },
      ]
    });
  }
};
