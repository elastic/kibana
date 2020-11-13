/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionTypeModel } from '../../../../../../triggers_actions_ui/public/types';
import * as i18n from './translations';

export function getActionType(): ActionTypeModel {
  return {
    id: '.case',
    iconClass: 'securityAnalyticsApp',
    selectMessage: i18n.CASE_CONNECTOR_DESC,
    actionTypeTitle: i18n.CASE_CONNECTOR_TITLE,
    validateConnector: () => ({ errors: {} }),
    validateParams: () => ({ errors: {} }),
    actionConnectorFields: null,
    actionParamsFields: null,
  };
}
