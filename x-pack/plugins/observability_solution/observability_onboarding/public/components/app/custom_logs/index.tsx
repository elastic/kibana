/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomIntegrationOptions } from '@kbn/custom-integrations';
import { i18n } from '@kbn/i18n';
import {
  createWizardContext,
  Step,
} from '../../../context/create_wizard_context';
import { ConfigureLogs } from './configure_logs';
import { Inspect } from './inspect';
import { InstallElasticAgent } from './install_elastic_agent';
import { SelectLogs } from './select_logs';

interface WizardState {
  integrationName?: string;
  lastCreatedIntegrationOptions?: CustomIntegrationOptions;
  datasetName?: string;
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
  integrationName: undefined,
  datasetName: undefined,
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

const steps: Record<CustomLogsSteps, Step> = {
  selectLogs: { component: SelectLogs },
  configureLogs: { component: ConfigureLogs },
  installElasticAgent: {
    component: InstallElasticAgent,
    title: i18n.translate(
      'xpack.observability_onboarding.customLogs.installShipper.title',
      {
        defaultMessage: 'Install shipper to collect logs',
      }
    ),
  },
  inspect: { component: Inspect },
};

const {
  Provider,
  useWizard,
  routes: customLogsRoutes,
} = createWizardContext({
  initialState,
  initialStep: 'configureLogs',
  steps,
  basePath: '/customLogs',
});

export { Provider, useWizard, customLogsRoutes };
