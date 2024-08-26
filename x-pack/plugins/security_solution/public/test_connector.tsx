/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GenericValidationResult,
  ActionTypeModel as ConnectorTypeModel,
} from '@kbn/triggers-actions-ui-plugin/public';
import { lazy } from 'react';

const ConnectorTypeId = '.nikita';

export function getConnectorUIType(): ConnectorTypeModel<{}, {}, {}> {
  return {
    id: ConnectorTypeId,
    iconClass: 'graphApp',
    selectMessage: 'Build you drem',
    actionTypeTitle: 'Worfklow connector',
    actionConnectorFields: null,
    isExperimental: true,
    validateParams: async (): Promise<GenericValidationResult<unknown>> => {
      return { errors: {} };
    },
    actionParamsFields: lazy(() => import('./test_connector_form')),
    isSystemActionType: true,
  };
}
