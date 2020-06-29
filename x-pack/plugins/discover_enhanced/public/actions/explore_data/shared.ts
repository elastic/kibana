/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEmbeddable } from '../../../../../../src/plugins/embeddable/public';
import {
  VISUALIZE_EMBEDDABLE_TYPE,
  VisualizeEmbeddableContract,
} from '../../../../../../src/plugins/visualizations/public';

export const isOutputWithIndexPatterns = (
  output: unknown
): output is { indexPatterns: Array<{ id: string }> } => {
  if (!output || typeof output !== 'object') return false;
  return Array.isArray((output as any).indexPatterns);
};

export const isVisualizeEmbeddable = (
  embeddable?: IEmbeddable
): embeddable is VisualizeEmbeddableContract =>
  embeddable && embeddable?.type === VISUALIZE_EMBEDDABLE_TYPE ? true : false;

/**
 * @returns Returns empty string if no index pattern ID found.
 */
export const getIndexPattern = (embeddable?: IEmbeddable): string => {
  if (!embeddable) return '';
  const output = embeddable.getOutput();

  if (isOutputWithIndexPatterns(output) && output.indexPatterns.length > 0) {
    return output.indexPatterns[0].id;
  }

  return '';
};
