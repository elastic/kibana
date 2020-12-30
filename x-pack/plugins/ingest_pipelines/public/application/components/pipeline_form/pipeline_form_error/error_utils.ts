/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { flow } from 'fp-ts/lib/function';
import { isRight } from 'fp-ts/lib/Either';

import { i18nTexts } from './i18n_texts';

export interface PipelineError {
  reason: string;
  processorType?: string;
}
interface PipelineErrors {
  errors: PipelineError[];
}

interface ErrorNode {
  reason: string;
  processor_type?: string;
  suppressed?: ErrorNode[];
}

// This is a runtime type (RT) for an error node which is a recursive type
const errorNodeRT = t.recursion<ErrorNode>('ErrorNode', (ErrorNode) =>
  t.intersection([
    t.interface({
      reason: t.string,
    }),
    t.partial({
      processor_type: t.string,
      suppressed: t.array(ErrorNode),
    }),
  ])
);

// This is a runtime type for the attributes object we expect to receive from the server
// for processor errors
const errorAttributesObjectRT = t.interface({
  attributes: t.interface({
    error: t.interface({
      root_cause: t.array(errorNodeRT),
    }),
  }),
});

const isProcessorsError = flow(errorAttributesObjectRT.decode, isRight);

type ErrorAttributesObject = t.TypeOf<typeof errorAttributesObjectRT>;

const flattenErrorsTree = (node: ErrorNode): PipelineError[] => {
  const result: PipelineError[] = [];
  const recurse = (_node: ErrorNode) => {
    result.push({ reason: _node.reason, processorType: _node.processor_type });
    if (_node.suppressed && Array.isArray(_node.suppressed)) {
      _node.suppressed.forEach(recurse);
    }
  };
  recurse(node);
  return result;
};

export const toKnownError = (error: unknown): PipelineErrors => {
  if (typeof error === 'object' && error != null && isProcessorsError(error)) {
    const errorAttributes = error as ErrorAttributesObject;
    const rootCause = errorAttributes.attributes.error.root_cause[0];
    return { errors: flattenErrorsTree(rootCause) };
  }

  if (typeof error === 'string') {
    return { errors: [{ reason: error }] };
  }

  if (
    error instanceof Error ||
    (typeof error === 'object' && error != null && (error as any).message)
  ) {
    return { errors: [{ reason: (error as any).message }] };
  }

  return { errors: [{ reason: i18nTexts.errors.unknownError }] };
};
