/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { prefixIndexPattern } from '../ccs_utils';
import { INFRA_SOURCE_ID } from '../../../common/constants';
import { MonitoringConfig } from '../../config';
import { InfraPluginSetup } from '../../../../infra/server';

export const initInfraSource = (config: MonitoringConfig, infraPlugin: InfraPluginSetup) => {
  if (infraPlugin) {
    const filebeatIndexPattern = prefixIndexPattern(config, config.ui.logs.index, '*');
    infraPlugin.defineInternalSourceConfiguration(INFRA_SOURCE_ID, {
      name: 'Elastic Stack Logs',
      logAlias: filebeatIndexPattern,
    });
  }
};
