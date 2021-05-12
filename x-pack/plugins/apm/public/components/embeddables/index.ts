/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/public';
import { EmbeddableSetup } from '../../../../../../src/plugins/embeddable/public';
import { createCallApmApi } from '../../services/rest/createCallApmApi';
import { ThroughputEmbeddableFactory } from './throughput/throughput_embeddable_factory';
import { ErrorRateEmbeddableFactory } from './transactions_error_rate';

export function registerEmbeddables(
  embeddable: EmbeddableSetup,
  core: CoreSetup
) {
  createCallApmApi(core);
  const ErrorRateEmbeddable = new ErrorRateEmbeddableFactory();
  embeddable.registerEmbeddableFactory(
    ErrorRateEmbeddable.type,
    ErrorRateEmbeddable
  );

  const ThroughputEmbeddable = new ThroughputEmbeddableFactory();
  embeddable.registerEmbeddableFactory(
    ThroughputEmbeddable.type,
    ThroughputEmbeddable
  );
}
