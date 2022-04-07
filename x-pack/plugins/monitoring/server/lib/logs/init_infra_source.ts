/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import { prefixIndexPattern } from '../../../common/ccs_utils';
import { INFRA_SOURCE_ID } from '../../../common/constants';
import { MonitoringConfig } from '../../config';
import { InfraPluginSetup } from '../../../../infra/server';

export const initInfraSource = (config: MonitoringConfig, infraPlugin: InfraPluginSetup) => {
  if (infraPlugin) {
    const filebeatIndexPattern = prefixIndexPattern(
      config,
      config.ui.logs.index,
      config.ui.ccs.remotePatterns
    );
    infraPlugin.defineInternalSourceConfiguration(INFRA_SOURCE_ID, {
      name: 'Elastic Stack Logs',
      logIndices: {
        type: 'index_name',
        indexName: filebeatIndexPattern,
      },
    });
  }
};
