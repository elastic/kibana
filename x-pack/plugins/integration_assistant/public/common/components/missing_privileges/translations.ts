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

export const PRIVILEGES_MISSING_DESCRIPTION = i18n.translate(
  'xpack.integrationAssistant.missingPrivileges.description',
  {
    defaultMessage: 'Missing privileges to create a custom integration. ',
  }
);

export const PRIVILEGES_NEEDED_TITLE = i18n.translate(
  'xpack.integrationAssistant.missingPrivileges.privilegesNeededTitle',
  {
    defaultMessage: 'The required privileges to create an integration:',
  }
);

export const REQUIRED_PRIVILEGES = {
  FLEET: i18n.translate('xpack.integrationAssistant.missingPrivileges.requiredPrivileges.fleet', {
    defaultMessage: 'Fleet: All',
  }),
  INTEGRATIONS: i18n.translate(
    'xpack.integrationAssistant.missingPrivileges.requiredPrivileges.integrations',
    {
      defaultMessage: 'Integrations: All',
    }
  ),
  CONNECTORS: i18n.translate(
    'xpack.integrationAssistant.missingPrivileges.requiredPrivileges.connectors',
    {
      defaultMessage: 'Actions & Connectors: Read',
    }
  ),
};

export const CONTACT_ADMINISTRATOR = i18n.translate(
  'xpack.integrationAssistant.missingPrivileges.contactAdministrator',
  {
    defaultMessage: 'Contact your administrator for assistance.',
  }
);
