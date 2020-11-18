/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import {
  ActionTypeConfig,
  ActionTypeSecrets,
  ActionTypeParams,
  ActionType,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../actions/server/types';
import {
  CaseServiceSetup,
  CaseConfigureServiceSetup,
  CaseUserActionServiceSetup,
  ConnectorMappingsServiceSetup,
} from '../services';

import { getActionType as getCaseConnector } from './case';
export { CASE_ACTION_TYPE_ID } from './case';

export interface GetActionTypeParams {
  logger: Logger;
  caseService: CaseServiceSetup;
  caseConfigureService: CaseConfigureServiceSetup;
  connectorMappingsService: ConnectorMappingsServiceSetup;
  userActionService: CaseUserActionServiceSetup;
}

export interface RegisterConnectorsArgs extends GetActionTypeParams {
  actionsRegisterType<
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets,
    Params extends ActionTypeParams = ActionTypeParams,
    ExecutorResultData = void
  >(
    actionType: ActionType<Config, Secrets, Params, ExecutorResultData>
  ): void;
}

export const registerConnectors = ({
  actionsRegisterType,
  logger,
  caseService,
  caseConfigureService,
  connectorMappingsService,
  userActionService,
}: RegisterConnectorsArgs) => {
  actionsRegisterType(
    getCaseConnector({
      logger,
      caseService,
      caseConfigureService,
      connectorMappingsService,
      userActionService,
    })
  );
};
