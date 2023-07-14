/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentType } from 'react';
import { createWizardContext } from '../../../../context/create_wizard_context';
import { ConfigureLogs } from './configure_logs';
import { Inspect } from './inspect';
import { InstallElasticAgent } from './install_elastic_agent';
import { SelectLogs } from './select_logs';

interface WizardState {
  datasetName: string;
  serviceName: string;
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
  apiKeyEncoded: string;
  onboardingId: string;
}

const initialState: WizardState = {
  datasetName: '',
  serviceName: '',
  logFilePaths: [''],
  namespace: 'default',
  customConfigurations: '',
  elasticAgentPlatform: 'linux-tar',
  autoDownloadConfig: false,
  apiKeyEncoded: '',
  onboardingId: '',
};

export type CustomLogsSteps =
  | 'selectLogs'
  | 'configureLogs'
  | 'installElasticAgent'
  | 'inspect';

const steps: Record<CustomLogsSteps, ComponentType<{}>> = {
  selectLogs: SelectLogs,
  configureLogs: ConfigureLogs,
  installElasticAgent: InstallElasticAgent,
  inspect: Inspect,
};

const {
  Provider,
  useWizard,
  routes: customLogsRoutes,
} = createWizardContext({
  initialState,
  initialStep: 'selectLogs',
  steps,
  basePath: '/customLogs',
});

export { Provider, useWizard, customLogsRoutes };
