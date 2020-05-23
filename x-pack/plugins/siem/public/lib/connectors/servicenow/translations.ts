/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export * from '../translations';

export const SERVICENOW_DESC = i18n.translate(
  'xpack.siem.case.connectors.servicenow.selectMessageText',
  {
    defaultMessage: 'Push or update SIEM case data to a new incident in ServiceNow',
  }
);

export const SERVICENOW_TITLE = i18n.translate(
  'xpack.siem.case.connectors.servicenow.actionTypeTitle',
  {
    defaultMessage: 'ServiceNow',
  }
);
