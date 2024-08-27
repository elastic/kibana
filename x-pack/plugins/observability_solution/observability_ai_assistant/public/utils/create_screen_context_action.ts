/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FromSchema } from 'json-schema-to-ts';
import { CompatibleJSONSchema } from '../../common/functions/types';
import type {
  ScreenContextActionDefinition,
  ScreenContextActionRespondFunction,
} from '../../common/types';

type ReturnOf<TActionDefinition extends Omit<ScreenContextActionDefinition, 'respond'>> =
  TActionDefinition['parameters'] extends CompatibleJSONSchema
    ? FromSchema<TActionDefinition['parameters']>
    : undefined;

export function createScreenContextAction<
  TActionDefinition extends Omit<ScreenContextActionDefinition, 'respond'>,
  TRespondFunction extends ScreenContextActionRespondFunction<ReturnOf<TActionDefinition>>
>(
  definition: TActionDefinition,
  respond: TRespondFunction
): ScreenContextActionDefinition<ReturnOf<TActionDefinition>> {
  return {
    ...definition,
    respond,
  } as ScreenContextActionDefinition<unknown>;
}
