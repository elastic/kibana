/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IContainer } from '../../../../../../../src/plugins/embeddable/public';
import {
  ErrorRateEmbeddable,
  ErrorRateInput,
  ERROR_RATE_EMBEDDABLE,
} from './error_rate_embeddable';
import { APMEmbeddableFactory } from '../apm_embeddable_factory';

export class ErrorRateEmbeddableFactory extends APMEmbeddableFactory<
  ErrorRateInput,
  {},
  ErrorRateEmbeddable
> {
  constructor() {
    super(
      ERROR_RATE_EMBEDDABLE,
      i18n.translate('xpack.apm.embeddables.errorRate.displayName', {
        defaultMessage: 'Error rate chart',
      })
    );
  }

  public async create(initialInput: ErrorRateInput, parent?: IContainer) {
    return new ErrorRateEmbeddable(initialInput, parent);
  }
}
