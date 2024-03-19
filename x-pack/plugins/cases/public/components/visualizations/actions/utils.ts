/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import { LENS_EMBEDDABLE_TYPE, type Embeddable as LensEmbeddable } from '@kbn/lens-plugin/public';
import type { PersistableStateAttachmentPayload } from '@kbn/cases-common-types';
import { AttachmentType } from '@kbn/cases-common-types';
import { LENS_ATTACHMENT_TYPE } from '@kbn/cases-common-constants';
import type { LensProps } from '../types';

export const isLensEmbeddable = (embeddable: IEmbeddable): embeddable is LensEmbeddable => {
  return embeddable.type === LENS_EMBEDDABLE_TYPE;
};

export const hasInput = (embeddable: LensEmbeddable) => {
  const { timeRange } = embeddable.getInput();
  const attributes = embeddable.getFullAttributes();
  return attributes != null && timeRange != null;
};

type PersistableStateAttachmentWithoutOwner = Omit<PersistableStateAttachmentPayload, 'owner'>;

export const getLensCaseAttachment = ({
  timeRange,
  attributes,
  metadata,
}: {
  timeRange: LensProps['timeRange'];
  attributes: LensSavedObjectAttributes;
  metadata?: LensProps['metadata'];
}): PersistableStateAttachmentWithoutOwner =>
  ({
    persistableStateAttachmentState: { attributes, timeRange, metadata },
    persistableStateAttachmentTypeId: LENS_ATTACHMENT_TYPE,
    type: AttachmentType.persistableState,
  } as unknown as PersistableStateAttachmentWithoutOwner);
