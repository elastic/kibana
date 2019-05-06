/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const NO_FILEBEAT_INDICES = i18n.translate(
  'xpack.siem.overview.network.noFilebeatIndicies',
  {
    defaultMessage: "Looks like you don't have any Filebeat and Auditbeat indices.",
  }
);

export const LETS_ADD_SOME = i18n.translate('xpack.siem.overview.letsAddSome.description', {
  defaultMessage: "Let's add some!",
});

export const SETUP_INSTRUCTIONS = i18n.translate('xpack.siem.overview.setupInstructions', {
  defaultMessage: 'Setup Instructions',
});
