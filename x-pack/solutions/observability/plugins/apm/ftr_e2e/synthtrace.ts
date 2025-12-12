/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  type Serializable,
  type ApmFields,
  type ApmOtelFields,
  type SynthtraceGenerator,
  type ApmSynthtracePipelines,
  ApmSynthtracePipelineSchema,
} from '@kbn/synthtrace-client';

export const synthtrace = {
  index: <TFields extends ApmFields | ApmOtelFields>(
    events: SynthtraceGenerator<TFields> | Array<Serializable<TFields>>,
    pipeline: ApmSynthtracePipelines = ApmSynthtracePipelineSchema.Default
  ) =>
    cy.task('synthtrace:index', {
      events: Array.from(events).flatMap((event) => event.serialize()),
      pipeline,
    }),
  clean: () => cy.task('synthtrace:clean'),
};
