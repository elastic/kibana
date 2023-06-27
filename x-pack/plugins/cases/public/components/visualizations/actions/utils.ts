/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { LENS_EMBEDDABLE_TYPE, type Embeddable as LensEmbeddable } from '@kbn/lens-plugin/public';
import { LENS_ATTACHMENT_TYPE } from '../../../../common/constants/visualizations';
import type { CommentRequestPersistableStateType } from '../../../../common/api';
import { CommentType } from '../../../../common';
import type { DashboardVisualizationEmbeddable, EmbeddableInput } from './types';

export const isLensEmbeddable = (embeddable: IEmbeddable): embeddable is LensEmbeddable => {
  return embeddable.type === LENS_EMBEDDABLE_TYPE;
};

export const hasInput = (embeddable: DashboardVisualizationEmbeddable) => {
  const { attributes, timeRange } = embeddable.getInput();
  return attributes != null && timeRange != null;
};

type PersistableStateAttachmentWithoutOwner = Omit<CommentRequestPersistableStateType, 'owner'>;

export const getLensCaseAttachment = ({
  timeRange,
  attributes,
}: Omit<EmbeddableInput, 'id'>): PersistableStateAttachmentWithoutOwner =>
  ({
    persistableStateAttachmentState: { attributes, timeRange },
    persistableStateAttachmentTypeId: LENS_ATTACHMENT_TYPE,
    type: CommentType.persistableState,
  } as unknown as PersistableStateAttachmentWithoutOwner);
