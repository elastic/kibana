/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */

import { InfraMlRequestHandlerContext, InfraRequestHandlerContext } from '../types';

export class MissingContextValuesError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NoMlPluginError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function assertHasInfraPlugins<Context extends { infra?: InfraRequestHandlerContext }>(
  context: Context
): asserts context is Context & { infra: Context['infra'] } {
  if (context.infra == null) {
    throw new MissingContextValuesError('Failed to access "infra" context values.');
  }
}

export function assertHasInfraMlPlugins<Context extends { infra?: InfraRequestHandlerContext }>(
  context: Context
): asserts context is Context & {
  infra: Context['infra'] & Required<InfraMlRequestHandlerContext>;
} {
  assertHasInfraPlugins(context);

  if (context.infra?.mlAnomalyDetectors == null || context.infra?.mlSystem == null) {
    throw new NoMlPluginError('Failed to access ML plugin.');
  }
}
