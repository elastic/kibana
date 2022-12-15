/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PersistableState, PersistableStateDefinition } from '@kbn/kibana-utils-plugin/common';
import type { CommentRequestPersistableStateType } from '../../common/api';

export type PersistableStateAttachmentState = Pick<
  CommentRequestPersistableStateType,
  'persistableStateAttachmentTypeId' | 'persistableStateAttachmentState'
>;

export interface PersistableStateAttachmentType
  extends PersistableState<PersistableStateAttachmentState> {
  id: string;
}

export interface PersistableStateAttachmentTypeSetup
  extends PersistableStateDefinition<PersistableStateAttachmentState> {
  id: string;
}

export interface ExternalReferenceAttachmentType {
  id: string;
}

export interface AttachmentFramework {
  registerExternalReference: (
    externalReferenceAttachmentType: ExternalReferenceAttachmentType
  ) => void;
  registerPersistableState: (
    persistableStateAttachmentType: PersistableStateAttachmentTypeSetup
  ) => void;
}
