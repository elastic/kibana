/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType } from '../../../../../../plugins/triggers_actions_ui/public';

import {
  ConfigType,
  SecretsType,
} from '../../../../actions/server/builtin_action_types/servicenow/types';

export interface ServiceNowActionConnector {
  config: ConfigType;
  secrets: SecretsType;
}

export interface Connector extends ActionType {
  logo: string;
}
