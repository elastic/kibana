/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { LensEmbeddableInput, LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import { LENS_EMBEDDABLE_TYPE, type Embeddable as LensEmbeddable } from '@kbn/lens-plugin/public';
import { CommentType } from '../../../../common';

export const isLensEmbeddable = (embeddable: IEmbeddable): embeddable is LensEmbeddable => {
  return embeddable.type === LENS_EMBEDDABLE_TYPE;
};

export const hasInput = (embeddable: LensEmbeddable) => {
  const { timeRange } = embeddable.getInput();
  const attributes = embeddable.getFullAttributes();
  return attributes != null && timeRange != null;
};

export const getLensCaseAttachment = ({
  timeRange,
  attributes,
}: {
  timeRange: LensEmbeddableInput['timeRange'];
  attributes: LensSavedObjectAttributes | undefined;
}) => ({
  comment: `!{lens${JSON.stringify({
    timeRange,
    attributes,
  })}}`,
  type: CommentType.user as const,
});
