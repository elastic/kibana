/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GET_STARTED_PAGE_TITLE = (userName: string) =>
  i18n.translate('xpack.securitySolution.onboarding.Title', {
    defaultMessage: `Hi {userName}!`,
    values: { userName },
  });

export const GET_STARTED_DATA_INGESTION_HUB_SUBTITLE = i18n.translate(
  'xpack.securitySolution.onboarding.subTitle',
  {
    defaultMessage: `Welcome to Elastic Security`,
  }
);

export const GET_STARTED_DATA_INGESTION_HUB_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.description',
  {
    defaultMessage: `A SIEM with AI-driven security analytics, XDR and Cloud Security.`,
  }
);
