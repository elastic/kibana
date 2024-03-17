/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { InfraRequestHandlerContext } from '../types';

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

export function assertHasInfraPlugins<
  Context extends { infra?: Promise<InfraRequestHandlerContext> }
>(context: Context): asserts context is Context & { infra: Context['infra'] } {
  if (context.infra == null) {
    throw new MissingContextValuesError('Failed to access "infra" context values.');
  }
}

export async function assertHasInfraMlPlugins<
  Context extends { infra?: Promise<InfraRequestHandlerContext> }
>(
  context: Context
): Promise<
  Context & {
    infra: Promise<Required<InfraRequestHandlerContext>>;
  }
> {
  assertHasInfraPlugins(context);

  const infraContext = await context.infra;
  if (infraContext?.mlAnomalyDetectors == null || infraContext?.mlSystem == null) {
    throw new NoMlPluginError('Failed to access ML plugin.');
  }

  return context as Context & {
    infra: Promise<Required<InfraRequestHandlerContext>>;
  };
}
