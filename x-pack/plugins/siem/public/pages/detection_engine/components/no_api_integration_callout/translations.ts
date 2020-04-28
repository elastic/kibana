/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const NO_API_INTEGRATION_KEY_CALLOUT_TITLE = i18n.translate(
  'xpack.siem.detectionEngine.noApiIntegrationKeyCallOutTitle',
  {
    defaultMessage: 'API integration key required',
  }
);

export const NO_API_INTEGRATION_KEY_CALLOUT_MSG = i18n.translate(
  'xpack.siem.detectionEngine.noApiIntegrationKeyCallOutMsg',
  {
    defaultMessage: `A new encryption key is generated for saved objects each time you start Kibana. Without a persistent key, you cannot delete or modify rules after Kibana restarts. To set a persistent key, add the xpack.encryptedSavedObjects.encryptionKey setting with any text value of 32 or more characters to the kibana.yml file.`,
  }
);

export const DISMISS_CALLOUT = i18n.translate(
  'xpack.siem.detectionEngine.dismissNoApiIntegrationKeyButton',
  {
    defaultMessage: 'Dismiss',
  }
);
