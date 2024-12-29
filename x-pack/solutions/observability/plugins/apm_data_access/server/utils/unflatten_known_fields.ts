/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DedotObject } from '@kbn/utility-types';
import * as APM_EVENT_FIELDS_MAP from '@kbn/apm-types/es_fields';
import type { ValuesType } from 'utility-types';
import { unflattenObject } from '@kbn/observability-utils-common/object/unflatten_object';
import { mergePlainObjects } from '@kbn/observability-utils-common/object/merge_plain_objects';
import { castArray, isArray } from 'lodash';
import { AgentName } from '@kbn/elastic-agent-utils';
import { EventOutcome } from '@kbn/apm-types/src/es_schemas/raw/fields';
import { ProcessorEvent } from '@kbn/observability-plugin/common';

const {
  CLOUD,
  AGENT,
  SERVICE,
  ERROR_EXCEPTION,
  SPAN_LINKS,
  HOST,
  KUBERNETES,
  CONTAINER,
  TIER,
  INDEX,
  DATA_STEAM_TYPE,
  VALUE_OTEL_JVM_PROCESS_MEMORY_HEAP,
  VALUE_OTEL_JVM_PROCESS_MEMORY_NON_HEAP,
  SPAN_LINKS_SPAN_ID,
  SPAN_LINKS_TRACE_ID,
  SPAN_STACKTRACE,
  ...CONCRETE_FIELDS
} = APM_EVENT_FIELDS_MAP;

const ALL_FIELDS = Object.values(CONCRETE_FIELDS);

const KNOWN_MULTI_VALUED_FIELDS = [
  APM_EVENT_FIELDS_MAP.CHILD_ID,
  APM_EVENT_FIELDS_MAP.PROCESS_ARGS,
] as const;

type KnownField = ValuesType<typeof CONCRETE_FIELDS>;

type KnownSingleValuedField = Exclude<KnownField, KnownMultiValuedField>;
type KnownMultiValuedField = ValuesType<typeof KNOWN_MULTI_VALUED_FIELDS>;

const KNOWN_SINGLE_VALUED_FIELDS = ALL_FIELDS.filter(
  (field): field is KnownSingleValuedField => !KNOWN_MULTI_VALUED_FIELDS.includes(field as any)
);

interface TypeOverrideMap {
  [APM_EVENT_FIELDS_MAP.SPAN_DURATION]: number;
  [APM_EVENT_FIELDS_MAP.AGENT_NAME]: AgentName;
  [APM_EVENT_FIELDS_MAP.EVENT_OUTCOME]: EventOutcome;
  [APM_EVENT_FIELDS_MAP.FAAS_COLDSTART]: true;
  [APM_EVENT_FIELDS_MAP.TRANSACTION_DURATION]: number;
  [APM_EVENT_FIELDS_MAP.TIMESTAMP_US]: number;
  [APM_EVENT_FIELDS_MAP.PROCESSOR_EVENT]: ProcessorEvent;
  [APM_EVENT_FIELDS_MAP.SPAN_COMPOSITE_COUNT]: number;
  [APM_EVENT_FIELDS_MAP.SPAN_COMPOSITE_SUM]: number;
  [APM_EVENT_FIELDS_MAP.SPAN_SYNC]: boolean;
  [APM_EVENT_FIELDS_MAP.TRANSACTION_SAMPLED]: boolean;
  [APM_EVENT_FIELDS_MAP.PROCESSOR_NAME]: 'transaction' | 'metric' | 'error';
  [APM_EVENT_FIELDS_MAP.HTTP_RESPONSE_STATUS_CODE]: number;
  [APM_EVENT_FIELDS_MAP.PROCESS_PID]: number;
  [APM_EVENT_FIELDS_MAP.OBSERVER_VERSION_MAJOR]: number;
  [APM_EVENT_FIELDS_MAP.ERROR_EXC_HANDLED]: boolean;
}

type MaybeMultiValue<T extends KnownField, U> = T extends KnownMultiValuedField ? U[] : U;

type TypeOfKnownField<T extends KnownField> = MaybeMultiValue<
  T,
  T extends keyof TypeOverrideMap ? TypeOverrideMap[T] : string
>;

type MapToSingleOrMultiValue<T extends Record<string, any>> = {
  [TKey in keyof T]: TKey extends KnownField
    ? T[TKey] extends undefined
      ? TypeOfKnownField<TKey> | undefined
      : TypeOfKnownField<TKey>
    : unknown;
};

type UnflattenedKnownFields<T extends Record<string, any>> = DedotObject<
  MapToSingleOrMultiValue<T>
>;

export type FlattenedApmEvent = Record<KnownSingleValuedField | KnownMultiValuedField, unknown[]>;

export type UnflattenedApmEvent = UnflattenedKnownFields<FlattenedApmEvent>;

export function unflattenKnownApmEventFields<T extends Record<string, any> | undefined = undefined>(
  fields: T
): T extends Record<string, any> ? UnflattenedKnownFields<T> : undefined;

export function unflattenKnownApmEventFields<
  T extends Record<string, any> | undefined,
  U extends Array<keyof Exclude<T, undefined>>
>(
  fields: T,
  required: U
): T extends Record<string, any>
  ? UnflattenedKnownFields<T> &
      (U extends any[]
        ? UnflattenedKnownFields<{
            [TKey in ValuesType<U>]: keyof T extends TKey ? T[TKey] : unknown[];
          }>
        : {})
  : undefined;

export function unflattenKnownApmEventFields(
  hitFields?: Record<string, any>,
  requiredFields?: string[]
) {
  if (!hitFields) {
    return undefined;
  }
  const missingRequiredFields =
    requiredFields?.filter((key) => {
      const value = hitFields?.[key];
      return value === null || value === undefined || (isArray(value) && value.length === 0);
    }) ?? [];

  if (missingRequiredFields.length > 0) {
    throw new Error(`Missing required fields ${missingRequiredFields.join(', ')} in event`);
  }

  const copy: Record<string, any> = mapToSingleOrMultiValue({
    ...hitFields,
  });

  const [knownFields, unknownFields] = Object.entries(copy).reduce(
    (prev, [key, value]) => {
      if (ALL_FIELDS.includes(key as KnownField)) {
        prev[0][key as KnownField] = value;
      } else {
        prev[1][key] = value;
      }
      return prev;
    },
    [{} as Record<KnownField, any>, {} as Record<string, any>]
  );

  const unflattened = mergePlainObjects(
    {},
    unflattenObject(unknownFields),
    unflattenObject(knownFields)
  );

  return unflattened;
}

export function mapToSingleOrMultiValue<T extends Record<string, any>>(
  fields: T
): MapToSingleOrMultiValue<T> {
  KNOWN_SINGLE_VALUED_FIELDS.forEach((field) => {
    const value = fields[field];
    if (value !== null && value !== undefined) {
      fields[field as keyof T] = castArray(value)[0];
    }
  });

  return fields;
}
