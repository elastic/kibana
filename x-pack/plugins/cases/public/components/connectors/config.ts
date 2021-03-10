/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getResilientActionType,
  getServiceNowITSMActionType,
  getServiceNowSIRActionType,
  getJiraActionType,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../triggers_actions_ui/public/common';
import { ConnectorConfiguration } from './types';

const resilient = getResilientActionType();
const serviceNowITSM = getServiceNowITSMActionType();
const serviceNowSIR = getServiceNowSIRActionType();
const jira = getJiraActionType();

export const connectorsConfiguration: Record<string, ConnectorConfiguration> = {
  '.servicenow': {
    name: serviceNowITSM.actionTypeTitle ?? '',
    logo: serviceNowITSM.iconClass,
  },
  '.servicenow-sir': {
    name: serviceNowSIR.actionTypeTitle ?? '',
    logo: serviceNowSIR.iconClass,
  },
  '.jira': {
    name: jira.actionTypeTitle ?? '',
    logo: jira.iconClass,
  },
  '.resilient': {
    name: resilient.actionTypeTitle ?? '',
    logo: resilient.iconClass,
  },
};
