/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  Serializable,
  SynthtraceGenerator,
  EntityFields,
  ApmFields,
} from '@kbn/apm-synthtrace-client';

export const entitiesSynthtrace = {
  index: (events: SynthtraceGenerator<EntityFields> | Array<Serializable<EntityFields>>) =>
    cy.task(
      'entitiesSynthtrace:index',
      Array.from(events).flatMap((event) => event.serialize())
    ),
  clean: () => cy.task('entitiesSynthtrace:clean'),
};

export const apmSynthtrace = {
  index: (events: SynthtraceGenerator<ApmFields> | Array<Serializable<ApmFields>>) =>
    cy.task(
      'apmSynthtrace:index',
      Array.from(events).flatMap((event) => event.serialize())
    ),
  clean: () => cy.task('apmSynthtrace:clean'),
};

export const logsSynthtrace = {
  index: (events: SynthtraceGenerator<ApmFields> | Array<Serializable<ApmFields>>) =>
    cy.task(
      'logsSynthtrace:index',
      Array.from(events).flatMap((event) => event.serialize())
    ),
  clean: () => cy.task('logsSynthtrace:clean'),
};
