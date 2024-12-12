/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOOKUPS_DATA_INPUT_COPY_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.missingLookupsList.title',
  { defaultMessage: 'Lookups found in your rules' }
);

export const MISSING_LOOKUPS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.description',
  {
    defaultMessage:
      'For your lookups, go to your admin Splunk account and the Search and Reporting app Lookups page. Download the following lookups individually and upload below.',
  }
);
