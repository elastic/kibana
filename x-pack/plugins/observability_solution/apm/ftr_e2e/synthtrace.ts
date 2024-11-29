/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Serializable, ApmFields, SynthtraceGenerator } from '@kbn/apm-synthtrace-client';

export const synthtrace = {
  index: (events: SynthtraceGenerator<ApmFields> | Array<Serializable<ApmFields>>) =>
    cy.task(
      'synthtrace:index',
      Array.from(events).flatMap((event) => event.serialize())
    ),
  clean: () => cy.task('synthtrace:clean'),
};

export const synthtraceOtel = {
  index: (events: SynthtraceGenerator<ApmFields> | Array<Serializable<ApmFields>>) =>
    cy.task(
      'synthtraceOtel:index',
      Array.from(events).flatMap((event) => event.serialize())
    ),
  clean: () => cy.task('synthtraceOtel:clean'),
};
