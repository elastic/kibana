/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KNOWN_SINGLE_VALUED_FIELDS,
  type FlattenedApmEvent,
  type MapToSingleOrMultiValue,
} from './utility_types';

type ValidateApmValue<
  P extends Partial<FlattenedApmEvent>,
  K extends keyof FlattenedApmEvent
> = MapToSingleOrMultiValue<P>[K];

type RequiredApmFields<R extends keyof FlattenedApmEvent> = Partial<FlattenedApmEvent> &
  Required<Pick<FlattenedApmEvent, R>>;

const KNOWN_SINGLE_VALUED_FIELDS_SET = new Set<string>(KNOWN_SINGLE_VALUED_FIELDS);

/**
 * Validates an APM Event object to see if it contains all defined `required` fields,
 * after which it provides an accessor function that strongly types the queried field.
 */
export function accessKnownApmEventFields<R extends keyof FlattenedApmEvent>(
  fields: Partial<FlattenedApmEvent>,
  required: R[]
): <K extends keyof FlattenedApmEvent>(key: K) => ValidateApmValue<RequiredApmFields<R>, K>;

export function accessKnownApmEventFields(fields: Record<string, any>, required: string[]) {
  const missingRequiredFields = required.filter((key) => fields[key] == null);

  if (missingRequiredFields.length) {
    throw new Error(`Missing required fields (${missingRequiredFields.join(', ')}) in event`);
  }

  return (key: string) => {
    const value = fields[key];

    return KNOWN_SINGLE_VALUED_FIELDS_SET.has(key) && Array.isArray(value) ? value[0] : value;
  };
}
