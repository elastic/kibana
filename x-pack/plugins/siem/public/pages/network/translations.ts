/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const NETWORK = i18n.translate('xpack.siem.network', {
  defaultMessage: 'Network',
});

export const NO_FILEBEAT_INDICES = i18n.translate('xpack.siem.network.noFilebeatIndicies', {
  defaultMessage: "Looks like you don't have any Filebeat indices.",
});

export const KQL_PLACE_HOLDER = i18n.translate('xpack.siem.network.kqlPlaceHolder', {
  defaultMessage: 'Search… (e.g. network.name:"foo" AND process.name:"bar")',
});

export const LETS_ADD_SOME = i18n.translate('xpack.siem.network.letsAddSome.description', {
  defaultMessage: "Let's add some!",
});

export const SETUP_INSTRUCTIONS = i18n.translate('xpack.siem.network.setupInstructions', {
  defaultMessage: 'Setup Instructions',
});
