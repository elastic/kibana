/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FromSchema } from 'json-schema-to-ts';
import type {
  ScreenContextActionDefinition,
  ScreenContextActionRespondFunction,
} from '../../common/types';

type ReturnOf<TActionDefinition extends Omit<ScreenContextActionDefinition, 'respond'>> =
  FromSchema<TActionDefinition['parameters']>;

export function createScreenContextAction<
  TActionDefinition extends Omit<ScreenContextActionDefinition, 'respond'>,
  TResponse = ReturnOf<TActionDefinition>
>(
  definition: TActionDefinition,
  respond: ScreenContextActionRespondFunction<TResponse>
): ScreenContextActionDefinition<TResponse> {
  return {
    ...definition,
    respond,
  };
}
