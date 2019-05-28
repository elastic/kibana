/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const KQL_PLACEHOLDER = i18n.translate('xpack.siem.hosts.kqlPlaceholder', {
  defaultMessage: 'e.g. host.name: "foo"',
});

export const PAGE_TITLE = i18n.translate('xpack.siem.hosts.pageTitle', {
  defaultMessage: 'Hosts',
});

export const EMPTY_TITLE = i18n.translate('xpack.siem.hosts.emptyTitle', {
  defaultMessage:
    'It looks like you don’t have any indices relevant to hosts in the SIEM application',
});

export const EMPTY_ACTION_PRIMARY = i18n.translate('xpack.siem.hosts.emptyActionPrimary', {
  defaultMessage: 'View setup instructions',
});

export const EMPTY_ACTION_SECONDARY = i18n.translate('xpack.siem.hosts.emptyActionSecondary', {
  defaultMessage: 'Go to documentation',
});
