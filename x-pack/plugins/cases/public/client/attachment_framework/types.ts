/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { EuiCommentProps, IconType } from '@elastic/eui';
import { CommentRequestExternalReferenceType } from '../../../common/api';
import { Case } from '../../containers/types';
import { AttachmentTypeRegistry } from './registry';

export interface ExternalReferenceAttachmentViewObject {
  type?: EuiCommentProps['type'];
  timelineIcon?: EuiCommentProps['timelineIcon'];
  actions?: EuiCommentProps['actions'];
  event?: EuiCommentProps['event'];
  children?: React.LazyExoticComponent<React.FC>;
}

export interface ExternalReferenceAttachmentViewProps {
  externalReferenceId: CommentRequestExternalReferenceType['externalReferenceId'];
  externalReferenceMetadata: CommentRequestExternalReferenceType['externalReferenceMetadata'];
  caseData: Pick<Case, 'id' | 'title'>;
}

export interface ExternalReferenceAttachmentType {
  id: string;
  icon: IconType;
  getAttachmentViewObject: (
    props: ExternalReferenceAttachmentViewProps
  ) => ExternalReferenceAttachmentViewObject;
}

export interface AttachmentFramework {
  registerExternalReference: (
    externalReferenceAttachmentType: ExternalReferenceAttachmentType
  ) => void;
}

export type ExternalReferenceAttachmentTypeRegistry =
  AttachmentTypeRegistry<ExternalReferenceAttachmentType>;
