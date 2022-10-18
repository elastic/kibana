/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecursivePartial } from '@elastic/eui';
import {
  ActionParamsProps,
  UserConfiguredActionConnector,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import type {
  OpsgenieActionConfig,
  OpsgenieActionSecrets,
  OpsgenieCreateAlertSubActionParams,
  OpsgenieCreateAlertParams,
  OpsgenieCloseAlertSubActionParams,
  OpsgenieActionParams,
} from '../../../../server/connector_types/stack';

export type OpsgenieActionConnector = UserConfiguredActionConnector<
  OpsgenieActionConfig,
  OpsgenieActionSecrets
>;

interface CreateAlertSubActionParamsValidation extends OpsgenieCreateAlertSubActionParams {
  subActionParams: OpsgenieCreateAlertParams & {
    advancedEditor: string[];
  };
}

export type ValidationParams = RecursivePartial<
  CreateAlertSubActionParamsValidation | OpsgenieCloseAlertSubActionParams
>;

type EditActionParameters = Parameters<ActionParamsProps<OpsgenieActionParams>['editAction']>;

export type EditActionCallback = (
  key: EditActionParameters[0],
  value: EditActionParameters[1]
) => ReturnType<ActionParamsProps<OpsgenieActionParams>['editAction']>;
