/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export * from '../translations';

export const RESILIENT_DESC = i18n.translate(
  'xpack.siem.case.connectors.resilient.selectMessageText',
  {
    defaultMessage: 'Push or update IBM Resilient case data to a new incident in ServiceNow',
  }
);

export const RESILIENT_TITLE = i18n.translate(
  'xpack.siem.case.connectors.resilient.actionTypeTitle',
  {
    defaultMessage: 'IBM Resilient',
  }
);

export const RESILIENT_ORG_ID = i18n.translate('xpack.siem.case.connectors.resilient.orgId', {
  defaultMessage: 'Organization ID',
});

export const RESILIENT_ORG_ID_REQUIRED = i18n.translate(
  'xpack.siem.case.connectors.common.requiredOrgIdTextField',
  {
    defaultMessage: 'Organization ID is required',
  }
);
