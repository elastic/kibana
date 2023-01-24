/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CREATE_COMMENT_WARNING_TITLE = i18n.translate(
  'xpack.cases.connectors.card.createCommentWarningTitle',
  {
    defaultMessage: 'Unable to share case comments',
  }
);

export const CREATE_COMMENT_WARNING_DESC = (connectorName: string) =>
  i18n.translate('xpack.cases.connectors.card.createCommentWarningDesc', {
    values: { connectorName },
    defaultMessage:
      'Configure the Create Comment URL and Create Comment Objects fields for the {connectorName} connector to share comments externally.',
  });
