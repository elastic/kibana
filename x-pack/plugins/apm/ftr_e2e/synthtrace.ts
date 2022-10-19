/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Fields, SignalIterable } from '@kbn/apm-synthtrace';
import { SignalTransferData } from '@kbn/apm-synthtrace';

export const synthtrace = {
  index: (signals: SignalIterable<Fields>) => {
    const kibanaVersion: string = Cypress.env('KIBANA_VERSION');
    const kibanaMajor = parseInt(kibanaVersion.split('.')[0], 10);
    const transferableSignals = signals
      .toArray()
      .map(
        (s) =>
          new SignalTransferData(
            s.enrichWithVersionInformation(kibanaVersion, kibanaMajor)
          )
      );
    return cy.task('synthtrace:index', transferableSignals);
  },
  clean: () => cy.task('synthtrace:clean'),
};
