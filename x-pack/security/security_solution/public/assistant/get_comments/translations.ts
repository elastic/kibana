/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ASSISTANT = i18n.translate('xpack.securitySolution.assistant.getComments.assistant', {
  defaultMessage: 'Assistant',
});

export const AT = (timestamp: string) =>
  i18n.translate('xpack.securitySolution.assistant.getComments.at', {
    defaultMessage: 'at: {timestamp}',
    values: { timestamp },
  });

export const YOU = i18n.translate('xpack.securitySolution.assistant.getComments.you', {
  defaultMessage: 'You',
});

export const API_ERROR = i18n.translate('xpack.securitySolution.assistant.apiErrorTitle', {
  defaultMessage: 'An error occurred sending your message.',
});
