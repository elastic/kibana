/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { LENS_EMBEDDABLE_TYPE, type Embeddable as LensEmbeddable } from '@kbn/lens-plugin/public';

export const isLensEmbeddable = (embeddable: IEmbeddable): embeddable is LensEmbeddable => {
  return embeddable.type === LENS_EMBEDDABLE_TYPE;
};
