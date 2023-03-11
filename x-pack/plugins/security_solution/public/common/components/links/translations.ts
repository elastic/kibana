/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../../explore/network/components/details/translations';

export const CASE_DETAILS_LINK_ARIA = (detailName: string) =>
  i18n.translate('xpack.securitySolution.cases.caseTable.caseDetailsLinkAria', {
    values: { detailName },
    defaultMessage: 'click to visit case with title {detailName}',
  });
