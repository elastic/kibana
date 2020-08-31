/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEmbeddable } from '../../../../../../src/plugins/embeddable/public';

const isOutputWithIndexPatterns = (
  output: unknown
): output is { indexPatterns: Array<{ id: string }> } => {
  if (!output || typeof output !== 'object') return false;
  return Array.isArray((output as any).indexPatterns);
};

export const getIndexPatterns = (embeddable?: IEmbeddable): string[] => {
  if (!embeddable) return [];
  const output = embeddable.getOutput();

  return isOutputWithIndexPatterns(output) ? output.indexPatterns.map(({ id }) => id) : [];
};

export const hasExactlyOneIndexPattern = (embeddable?: IEmbeddable): boolean =>
  getIndexPatterns(embeddable).length === 1;
