/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_BEAT_FIELDS = (searchStrategy: string) =>
  i18n.translate('xpack.securitySolution.eventFilters.errorSearchDescription', {
    values: { searchStrategy },
    defaultMessage: `An error has occurred on getting fields with ${searchStrategy}`,
  });

export const FAIL_BEAT_FIELDS = (searchStrategy: string) =>
  i18n.translate('xpack.securitySolution.eventFilters.failSearchDescription', {
    values: { searchStrategy },
    defaultMessage: `Failed to run search on search ${searchStrategy}`,
  });
