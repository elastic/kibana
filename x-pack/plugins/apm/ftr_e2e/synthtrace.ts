/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EntityIterable } from '@kbn/apm-synthtrace';

export const synthtrace = {
  index: (events: EntityIterable) =>
    cy.task('synthtrace:index', events.toArray()),
  clean: () => cy.task('synthtrace:clean'),
};
