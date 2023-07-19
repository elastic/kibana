/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType, ExternalReferenceStorageType } from '../../../common/types/domain';
import type {
  UserCommentAttachmentPayload,
  FileAttachmentMetadata,
  AlertAttachmentPayload,
} from '../../../common/types/domain';
import { FILE_ATTACHMENT_TYPE } from '../../../common/constants';
import type { FileAttachmentRequest } from '../types';

export const createUserRequests = (num: number): UserCommentAttachmentPayload[] => {
  const requests = [...Array(num).keys()].map((value) => {
    return {
      comment: `${value}`,
      type: AttachmentType.user as const,
      owner: 'test',
    };
  });

  return requests;
};

export const createFileRequests = ({
  numRequests,
  numFiles,
}: {
  numRequests: number;
  numFiles: number;
}): FileAttachmentRequest[] => {
  const files: FileAttachmentMetadata['files'] = [...Array(numFiles).keys()].map((value) => {
    return {
      name: `${value}`,
      created: '2023-02-27T20:26:54.345Z',
      extension: 'png',
      mimeType: 'image/png',
    };
  });

  const requests: FileAttachmentRequest[] = [...Array(numRequests).keys()].map((value) => {
    return {
      type: AttachmentType.externalReference as const,
      externalReferenceAttachmentTypeId: FILE_ATTACHMENT_TYPE,
      externalReferenceId: 'so-id',
      externalReferenceMetadata: { files },
      externalReferenceStorage: {
        soType: `${value}`,
        type: ExternalReferenceStorageType.savedObject,
      },
      owner: 'test',
    };
  });

  return requests;
};

export const createAlertRequests = (
  numberOfRequests: number,
  alertIds: string | string[]
): AlertAttachmentPayload[] => {
  const requests = [...Array(numberOfRequests).keys()].map((value) => {
    return {
      type: AttachmentType.alert as const,
      alertId: alertIds,
      index: alertIds,
      rule: {
        id: null,
        name: null,
      },
      owner: `${value}`,
    };
  });

  return requests;
};
