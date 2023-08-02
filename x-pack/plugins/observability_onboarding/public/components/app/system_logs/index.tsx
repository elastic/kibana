/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  createWizardContext,
  Step,
} from '../../../context/create_wizard_context';
import { InstallElasticAgent } from './install_elastic_agent';

interface WizardState {
  elasticAgentPlatform: 'linux-tar' | 'macos' | 'windows';
  autoDownloadConfig: boolean;
  apiKeyEncoded: string;
  onboardingId: string;
}

const initialState: WizardState = {
  elasticAgentPlatform: 'linux-tar',
  autoDownloadConfig: false,
  apiKeyEncoded: '',
  onboardingId: '',
};

export type SystemLogsSteps = 'installElasticAgent';

const steps: Record<SystemLogsSteps, Step> = {
  installElasticAgent: {
    component: InstallElasticAgent,
    title: i18n.translate(
      'xpack.observability_onboarding.systemLogs.installShipper.title',
      { defaultMessage: 'Install shipper to collect system logs' }
    ),
  },
};

const {
  Provider,
  useWizard,
  routes: systemLogsRoutes,
} = createWizardContext({
  initialState,
  initialStep: 'installElasticAgent',
  steps,
  basePath: '/systemLogs',
});

export { Provider, useWizard, systemLogsRoutes };
