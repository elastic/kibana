/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigureLogs } from './configure_logs';
import { SelectLogs } from './select_logs';
import { InstallElasticAgent } from './install_elastic_agent';
import { createWizardContext } from '../../../../context/create_wizard_context';
import { Inspect } from './inspect';

interface WizardState {
  datasetName: string;
  logFilePaths: string[];
  namespace: string;
  customConfigurations: string;
  logsType?:
    | 'system'
    | 'sys'
    | 'http-endpoint'
    | 'opentelemetry'
    | 'amazon-firehose'
    | 'log-file'
    | 'service';
  uploadType?: 'log-file' | 'api-key';
  elasticAgentPlatform: 'linux-tar' | 'macos' | 'windows' | 'deb' | 'rpm';
  autoDownloadConfig: boolean;
}

const initialState: WizardState = {
  datasetName: '',
  logFilePaths: [''],
  namespace: 'default',
  customConfigurations: '',
  elasticAgentPlatform: 'linux-tar',
  autoDownloadConfig: false,
};

const { Provider, Step, useWizard } = createWizardContext({
  initialState,
  initialStep: 'selectLogs',
  steps: {
    selectLogs: SelectLogs,
    configureLogs: ConfigureLogs,
    installElasticAgent: InstallElasticAgent,
    inspect: Inspect,
  },
});

export { Provider, Step, useWizard };
