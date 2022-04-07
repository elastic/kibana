/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/logging';
import { ServiceNow } from '.';
import { ActionsConfigurationUtilities } from '../../../actions_config';
import {
  ExecutorParams,
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
  SNProductsConfigValue,
} from '../../../builtin_action_types/servicenow/types';

export class ServiceNowItsm extends ServiceNow {
  private static internalConfig: SNProductsConfigValue = {
    importSetTable: 'x_elas2_inc_int_elastic_incident',
    appScope: 'x_elas2_inc_int',
    table: 'incident',
    useImportAPI: true,
    commentFieldKey: 'work_notes',
    appId: '7148dbc91bf1f450ced060a7234bcb88',
  };

  constructor({
    config,
    configurationUtilities,
    logger,
    params,
    secrets,
  }: {
    config: ServiceNowPublicConfigurationType;
    configurationUtilities: ActionsConfigurationUtilities;
    logger: Logger;
    params: ExecutorParams;
    secrets: ServiceNowSecretConfigurationType;
  }) {
    super({
      config,
      configurationUtilities,
      internalConfig: ServiceNowItsm.internalConfig,
      logger,
      secrets,
    });
  }
}
