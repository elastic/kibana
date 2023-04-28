/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NameLogs } from './name_logs';
import { ConfigureLogs } from './configure_logs';
import { InstallElasticAgent } from './install_elastic_agent';
import { createWizardContext } from '../../../../context/create_wizard_context';
import { ImportData } from './import_data';
import { Inspect } from './inspect';

interface WizardState {
  datasetName: string;
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
  alternativeShippers: {
    filebeat: boolean;
    fluentbit: boolean;
    logstash: boolean;
    fluentd: boolean;
  };
}

const initialState: WizardState = {
  datasetName: '',
  elasticAgentPlatform: 'linux-tar',
  alternativeShippers: {
    filebeat: false,
    fluentbit: false,
    logstash: false,
    fluentd: false,
  },
};

const { Provider, Step, useWizard } = createWizardContext({
  initialState,
  initialStep: 'nameLogs',
  steps: {
    nameLogs: NameLogs,
    configureLogs: ConfigureLogs,
    installElasticAgent: InstallElasticAgent,
    importData: ImportData,
    inspect: Inspect,
  },
});

export { Provider, Step, useWizard };
