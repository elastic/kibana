/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraPluginSetup } from '@kbn/infra-plugin/server';
import { CCS_REMOTE_PATTERN, INFRA_SOURCE_ID } from '../../../common/constants';
import { MonitoringConfig } from '../../config';
import { getIndexPatterns } from '../cluster/get_index_patterns';

export const initInfraSource = (config: MonitoringConfig, infraPlugin: InfraPluginSetup) => {
  if (infraPlugin) {
    const logsIndexPattern = getIndexPatterns({
      config,
      type: 'logs',
      ccs: CCS_REMOTE_PATTERN,
    });

    infraPlugin.logViews.defineInternalLogView(INFRA_SOURCE_ID, {
      name: 'Elastic Stack Logs',
      logIndices: {
        type: 'index_name',
        indexName: logsIndexPattern,
      },
    });
  }
};
