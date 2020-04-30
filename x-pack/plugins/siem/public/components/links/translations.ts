/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export * from '../page/network/ip_overview/translations';

export const CASE_DETAILS_LINK_ARIA = (detailName: string) =>
  i18n.translate('xpack.siem.case.caseTable.caseDetailsLinkAria', {
    values: { detailName },
    defaultMessage: 'click to visit case with title {detailName}',
  });
