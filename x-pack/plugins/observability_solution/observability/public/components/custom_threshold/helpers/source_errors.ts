/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const missingHttpMessage = i18n.translate(
  'xpack.observability.customThreshold.rule.sourceConfiguration.missingHttp',
  {
    defaultMessage: 'Failed to load source: No HTTP client available.',
  }
);

/**
 * Errors
 */
export class MissingHttpClientException extends Error {
  constructor() {
    super(missingHttpMessage);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'MissingHttpClientException';
  }
}
