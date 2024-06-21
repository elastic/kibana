/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LANDING_TITLE = i18n.translate('xpack.integrationAssistant.missingPrivileges.title', {
  defaultMessage: 'Create new integration',
});

export const PRIVILEGES_MISSING_TITLE = i18n.translate(
  'xpack.integrationAssistant.missingPrivileges.title',
  {
    defaultMessage: 'Missing privileges',
  }
);

export const PRIVILEGES_REQUIRED_TITLE = i18n.translate(
  'xpack.integrationAssistant.missingPrivileges.privilegesNeededTitle',
  {
    defaultMessage: 'The required Kibana privileges are:',
  }
);

export const REQUIRED_PRIVILEGES = {
  FLEET_ALL: i18n.translate(
    'xpack.integrationAssistant.missingPrivileges.requiredPrivileges.fleet',
    {
      defaultMessage: 'Management > Fleet: All',
    }
  ),
  INTEGRATIONS_ALL: i18n.translate(
    'xpack.integrationAssistant.missingPrivileges.requiredPrivileges.integrations',
    {
      defaultMessage: 'Management > Integrations: All',
    }
  ),
  CONNECTORS_READ: i18n.translate(
    'xpack.integrationAssistant.missingPrivileges.requiredPrivileges.connectors',
    {
      defaultMessage: 'Management > Actions & Connectors: Read',
    }
  ),
  CONNECTORS_ALL: i18n.translate(
    'xpack.integrationAssistant.missingPrivileges.requiredPrivileges.connectors',
    {
      defaultMessage: 'Management > Actions & Connectors: All',
    }
  ),
};

export const CONTACT_ADMINISTRATOR = i18n.translate(
  'xpack.integrationAssistant.missingPrivileges.contactAdministrator',
  {
    defaultMessage: 'Contact your administrator for assistance.',
  }
);
