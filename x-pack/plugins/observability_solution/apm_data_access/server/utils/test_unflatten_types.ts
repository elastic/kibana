/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { APMError, Span, Transaction } from '@kbn/apm-types/es_schemas_ui';
import { DedotObject } from '@kbn/utility-types';
import { Omit } from 'utility-types';
import { UnflattenedApmEvent } from './unflatten_known_fields';

function assertType<TShape = never>(value: TShape) {
  return value;
}

assertType<Transaction>(
  {} as DedotObject<Omit<UnflattenedApmEvent, 'span'>> & {
    processor: { name: 'transaction'; event: 'transaction' };
  }
);

assertType<Span>(
  {} as DedotObject<UnflattenedApmEvent> & {
    processor: { name: 'span'; event: 'transaction' };
  }
);

assertType<APMError>(
  {} as DedotObject<UnflattenedApmEvent> & {
    processor: { name: 'error'; event: 'error' };
  }
);
