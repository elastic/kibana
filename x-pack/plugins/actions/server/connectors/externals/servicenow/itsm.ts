/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ServiceNow } from '.';
import {
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
  SNProductsConfigValue,
} from '../../../builtin_action_types/servicenow/types';
import { ServiceParams } from '../../../http_framework/types';

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
    secrets,
    services,
  }: ServiceParams<ServiceNowPublicConfigurationType, ServiceNowSecretConfigurationType>) {
    super({
      config,
      configurationUtilities,
      internalConfig: ServiceNowItsm.internalConfig,
      logger,
      secrets,
      services,
    });
  }
}
