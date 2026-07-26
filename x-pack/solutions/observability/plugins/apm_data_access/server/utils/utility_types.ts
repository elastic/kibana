/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as APM_EVENT_FIELDS_MAP from '@kbn/apm-types/es_fields';
import type { DedotObject } from '@kbn/utility-types';
import type { ValuesType } from 'utility-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { EventOutcome, StatusCode } from '@kbn/apm-types/src/es_schemas/raw/fields';
import type { ProcessorEvent } from '@kbn/apm-types-shared';

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
  VALUE_OTEL_JVM_MEMORY_TYPE_HEAP,
  VALUE_OTEL_JVM_MEMORY_TYPE_NON_HEAP,
  SPAN_STACKTRACE,
  ...CONCRETE_FIELDS
} = APM_EVENT_FIELDS_MAP;

export const ALL_FIELDS = new Set(Object.values(CONCRETE_FIELDS));

export const KNOWN_MULTI_VALUED_FIELDS = [
  APM_EVENT_FIELDS_MAP.CHILD_ID,
  APM_EVENT_FIELDS_MAP.PROCESS_ARGS,
  APM_EVENT_FIELDS_MAP.OTEL_SPAN_LINKS_TRACE_ID,
  APM_EVENT_FIELDS_MAP.OTEL_SPAN_LINKS_SPAN_ID,
  APM_EVENT_FIELDS_MAP.SPAN_LINKS_TRACE_ID,
  APM_EVENT_FIELDS_MAP.SPAN_LINKS_SPAN_ID,
] as const;

export type KnownField = ValuesType<typeof CONCRETE_FIELDS>;

type KnownSingleValuedField = Exclude<KnownField, KnownMultiValuedField>;
type KnownMultiValuedField = ValuesType<typeof KNOWN_MULTI_VALUED_FIELDS>;

export const KNOWN_SINGLE_VALUED_FIELDS_SET = new Set<KnownField>(
  [...ALL_FIELDS].filter((field) => !KNOWN_MULTI_VALUED_FIELDS.includes(field as any))
);

interface TypeOverrideMap {
  [APM_EVENT_FIELDS_MAP.SPAN_DURATION]: number;
  [APM_EVENT_FIELDS_MAP.AGENT_NAME]: AgentName;
  [APM_EVENT_FIELDS_MAP.EVENT_OUTCOME]: EventOutcome;
  [APM_EVENT_FIELDS_MAP.STATUS_CODE]: StatusCode;
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

export type MapToSingleOrMultiValue<T extends Record<string, any>> = {
  [TKey in keyof T]: TKey extends KnownField
    ? T[TKey] extends undefined
      ? TypeOfKnownField<TKey> | undefined
      : TypeOfKnownField<TKey>
    : unknown;
};

export type UnflattenedKnownFields<T extends Record<string, any>> = DedotObject<
  MapToSingleOrMultiValue<T>
>;

export type FlattenedApmEvent = Record<KnownSingleValuedField | KnownMultiValuedField, unknown[]>;

export type UnflattenedApmEvent = UnflattenedKnownFields<FlattenedApmEvent>;

/**
 * Validates whether the field record object contains all required fields. Throws an error
 * if it does not.
 */
export function ensureRequiredApmFields(fields: Record<string, any>, required: string[]) {
  const missingRequiredFields = required.filter((key) => {
    const value = fields[key];

    return value == null || (Array.isArray(value) && value.length === 0);
  });

  if (missingRequiredFields.length) {
    throw new Error(`Missing required fields (${missingRequiredFields.join(', ')}) in event`);
  }
}
