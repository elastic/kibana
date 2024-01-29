/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const getDeleteDomainConfirmationMessage = (domainUrl: string) => {
  return i18n.translate(
    'xpack.enterpriseSearch.crawler.action.deleteDomain.confirmationPopupMessage',
    {
      defaultMessage:
        'Are you sure you want to remove the domain "{domainUrl}" and all of its settings?',
      values: {
        domainUrl,
      },
    }
  );
};
