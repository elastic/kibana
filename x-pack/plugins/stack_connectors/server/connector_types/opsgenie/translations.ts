/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UNKNOWN_ERROR = i18n.translate('xpack.stackConnectors.opsgenie.unknownError', {
  defaultMessage: 'unknown error',
});

export const OPSGENIE_NAME = i18n.translate('xpack.stackConnectors.opsgenie.name', {
  defaultMessage: 'Opsgenie',
});

export const MESSAGE_NON_EMPTY = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.nonEmptyMessageField',
  {
    defaultMessage: 'must be populated with a value other than just whitespace',
  }
);
