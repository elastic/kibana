/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  STATE_DATASET_FIELD,
  AGENT_DATASET_FILEBEAT,
  AGENT_DATASET_METRICBEAT,
} from '../agent_logs/constants';

export function displayInputType(inputType: string): string {
  if (inputType === 'logfile') {
    return i18n.translate('xpack.fleet.agentDetailsIntegrations.inputTypeLogText', {
      defaultMessage: 'Logs',
    });
  }
  if (inputType === 'endpoint') {
    return i18n.translate('xpack.fleet.agentDetailsIntegrations.inputTypeEndpointText', {
      defaultMessage: 'Endpoint',
    });
  }
  if (inputType.match(/\/metrics$/)) {
    return i18n.translate('xpack.fleet.agentDetailsIntegrations.inputTypeMetricsText', {
      defaultMessage: 'Metrics',
    });
  }

  return inputType;
}

export function getLogsQueryByInputType(inputType: string) {
  if (inputType === 'logfile') {
    return `(${STATE_DATASET_FIELD}:!(${AGENT_DATASET_FILEBEAT}))`;
  }
  if (inputType.match(/\/metrics$/)) {
    return `(${STATE_DATASET_FIELD}:!(${AGENT_DATASET_METRICBEAT}))`;
  }

  return '';
}
