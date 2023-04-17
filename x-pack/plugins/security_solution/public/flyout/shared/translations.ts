/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_TITLE = (title: string) =>
  i18n.translate('xpack.securitySolution.flyout.errorTitle', {
    values: { title },
    defaultMessage: 'Unable to display {title}',
  });

export const ERROR_MESSAGE = (message: string) =>
  i18n.translate('xpack.securitySolution.flyout.errorMessage', {
    values: { message },
    defaultMessage: 'There was an error displaying {message}',
  });
