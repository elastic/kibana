/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IContainer } from '../../../../../../../src/plugins/embeddable/public';
import { APMEmbeddableFactory } from '../apm_embeddable_factory';
import {
  ThroughputEmbeddable,
  ThroughputInput,
  THROUGHPUT_EMBEDDABLE,
} from './throughput_embeddable';

export class ThroughputEmbeddableFactory extends APMEmbeddableFactory<
  ThroughputInput,
  {},
  ThroughputEmbeddable
> {
  constructor() {
    super(
      THROUGHPUT_EMBEDDABLE,
      i18n.translate('xpack.apm.embeddables.throughputChart.displayName', {
        defaultMessage: 'Throughput chart',
      })
    );
  }
  public async create(initialInput: ThroughputInput, parent?: IContainer) {
    return new ThroughputEmbeddable(initialInput, parent);
  }
}
