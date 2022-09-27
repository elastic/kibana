/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Fields, SignalIterable } from '@kbn/apm-synthtrace';
import { SerializedSignal } from '@kbn/apm-synthtrace';

export const synthtrace = {
  index: (signals: SignalIterable<Fields>) => {
    const transferableSignals = signals
      .toArray()
      .map(
        (s) => new SerializedSignal(s.enrichWithVersionInformation('8.6.0', 8))
      );
    // eslint-disable-next-line no-console
    console.log(transferableSignals);
    return cy.task('synthtrace:index', transferableSignals);
  },
  clean: () => cy.task('synthtrace:clean'),
};
