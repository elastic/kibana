/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const HOSTS = i18n.translate('xpack.siem.hosts.hosts', {
  defaultMessage: 'Hosts',
});

export const NO_AUDITBEAT_INDICES = i18n.translate('xpack.siem.hosts.noAuditBeatIndicies', {
  defaultMessage: "Looks like you don't have any Auditbeat indices.",
});

export const KQL_PLACE_HOLDER = i18n.translate('xpack.siem.hosts.kqlPlaceHolder', {
  defaultMessage: 'Search… (e.g. host.name:"foo" AND process.name:"bar")',
});

export const LETS_ADD_SOME = i18n.translate('xpack.siem.hosts.letsAddSome.description', {
  defaultMessage: "Let's add some!",
});

export const SETUP_INSTRUCTIONS = i18n.translate('xpack.siem.hosts.setupInstructions', {
  defaultMessage: 'Setup Instructions',
});
