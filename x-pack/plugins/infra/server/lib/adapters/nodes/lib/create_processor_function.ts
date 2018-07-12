/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraProcessor, InfraProcessorTransformer } from '../../../infra_types';

export function createProcessorFunction<Options, Document>(
  chain: Array<InfraProcessor<Options, Document>>,
  options: Options
): InfraProcessorTransformer<Document> {
  const returnDoc: InfraProcessorTransformer<Document> = (doc: Document): Document => doc;
  return chain.reduceRight(
    (
      next: InfraProcessorTransformer<Document>,
      fn: InfraProcessor<Options, Document>
    ): InfraProcessorTransformer<Document> => {
      return fn(options)(next);
    },
    returnDoc
  );
}
