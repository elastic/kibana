/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/public';
import { EmbeddableSetup } from '../../../../../../src/plugins/embeddable/public';
import { createCallApmApi } from '../../services/rest/createCallApmApi';
import { ErrorRateEmbeddableFactoryDefinition } from './transactions_error_rate';
import { ServicesErrorRateEmbeddableFactoryDefinition } from './services_error_rate';

export function registerEmbeddables(
  embeddable: EmbeddableSetup,
  core: CoreSetup
) {
  createCallApmApi(core);
  const ErrorRateEmbeddableFactory = new ErrorRateEmbeddableFactoryDefinition();
  embeddable.registerEmbeddableFactory(
    ErrorRateEmbeddableFactory.type,
    ErrorRateEmbeddableFactory
  );

  const ServicesErrorRateEmbeddableFactory = new ServicesErrorRateEmbeddableFactoryDefinition();
  embeddable.registerEmbeddableFactory(
    ServicesErrorRateEmbeddableFactory.type,
    ServicesErrorRateEmbeddableFactory
  );
}
