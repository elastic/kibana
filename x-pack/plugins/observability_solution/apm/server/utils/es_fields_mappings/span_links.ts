/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRACE_ID,
  SPAN_ID,
  SPAN_NAME,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  SPAN_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_DURATION,
  PROCESSOR_EVENT,
  AGENT_NAME,
  Transaction,
  Span,
} from '@kbn/apm-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { Fields } from './types';
import { normalizeValue } from './es_fields_mappings_helpers';
import { serviceMapping } from './service';

export type SpanLinkedChild = ReturnType<typeof spanLinkedChildrenMapping>;
export type SpanLinksDetails = ReturnType<typeof spanLinksDetailsMapping>;

export const spanLinksDetailsMapping = (fields: Fields) => {
  if (!fields) return undefined;

  return {
    trace: {
      id: normalizeValue<string>(fields[TRACE_ID]),
    },
    span: {
      id: normalizeValue<string>(fields[SPAN_ID]),
      name: normalizeValue<string>(fields[SPAN_NAME]),
      type: normalizeValue<string>(fields[SPAN_TYPE]),
      subtype: normalizeValue<string>(fields[SPAN_SUBTYPE]),
      duration: {
        us: normalizeValue<number>(fields[SPAN_DURATION]),
      },
    },
    transaction: {
      id: normalizeValue<string>(fields[TRANSACTION_ID]),
      name: normalizeValue<string>(fields[TRANSACTION_NAME]),
      duration: {
        us: normalizeValue<number>(fields[TRANSACTION_DURATION]),
      },
    },
    ...serviceMapping(fields),
    processor: {
      event: normalizeValue<string>(fields[PROCESSOR_EVENT]),
    },
    agent: {
      name: normalizeValue<AgentName>(fields[AGENT_NAME]),
    },
  };
};

export const spanLinkedChildrenMapping = ({
  fields,
  _source,
}: {
  fields: Fields;
  _source?: Transaction | Span;
}) => {
  if (!fields) return undefined;

  return {
    trace: {
      id: normalizeValue<string>(fields[TRACE_ID]),
    },
    transaction: {
      id: normalizeValue<string>(fields[TRANSACTION_ID]),
    },
    processor: {
      event: normalizeValue<string>(fields[PROCESSOR_EVENT]),
    },
    span: {
      id: normalizeValue<string>(fields[SPAN_ID]),
      ...(_source?.span?.links ? { links: _source.span.links } : {}),
    },
  };
};
