/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { isArray, camelCase, isObject, omit, get } from 'lodash';
import type {
  AttachmentRequest,
  CaseResolveResponse,
  CasesFindResponse,
} from '../../common/types/api';
import type { Attachment, Case, Cases, UserActions } from '../../common/types/domain';
import {
  isCommentRequestTypeExternalReference,
  isCommentRequestTypePersistableState,
} from '../../common/utils/attachments';
import { isCommentUserAction } from '../../common/utils/user_actions';
import type {
  CasesFindResponseUI,
  CasesUI,
  CaseUI,
  AttachmentUI,
  ResolvedCase,
} from '../containers/types';

export const convertArrayToCamelCase = (arrayOfSnakes: unknown[]): unknown[] =>
  arrayOfSnakes.reduce((acc: unknown[], value) => {
    if (isArray(value)) {
      acc.push(convertArrayToCamelCase(value));
    } else if (isObject(value)) {
      acc.push(convertToCamelCase(value));
    } else {
      acc.push(value);
    }
    return acc;
  }, []);

export const convertToCamelCase = <T, U extends {}>(obj: T): U =>
  Object.entries(obj as never).reduce((acc, [key, value]) => {
    if (isArray(value)) {
      set(acc, camelCase(key), convertArrayToCamelCase(value));
    } else if (isObject(value)) {
      set(acc, camelCase(key), convertToCamelCase(value));
    } else {
      set(acc, camelCase(key), value);
    }
    return acc;
  }, {} as U);

export const convertCaseToCamelCase = (theCase: Case): CaseUI => {
  const { comments, ...restCase } = theCase;
  return {
    ...convertToCamelCase<Case, CaseUI>(restCase),
    ...(comments != null ? { comments: convertAttachmentsToCamelCase(comments) } : {}),
  };
};

export const convertCasesToCamelCase = (cases: Cases): CasesUI => cases.map(convertCaseToCamelCase);

export const convertCaseResolveToCamelCase = (res: CaseResolveResponse): ResolvedCase => {
  const { case: theCase, ...rest } = res;
  return {
    ...convertToCamelCase(rest),
    case: convertCaseToCamelCase(theCase),
  };
};

export const convertAttachmentsToCamelCase = (attachments: Attachment[]): AttachmentUI[] => {
  return attachments.map((attachment) => convertAttachmentToCamelCase(attachment));
};

export const convertAttachmentToCamelCase = (attachment: AttachmentRequest): AttachmentUI => {
  if (isCommentRequestTypeExternalReference(attachment)) {
    return convertAttachmentToCamelExceptProperty(attachment, 'externalReferenceMetadata');
  }

  if (isCommentRequestTypePersistableState(attachment)) {
    return convertAttachmentToCamelExceptProperty(attachment, 'persistableStateAttachmentState');
  }

  return convertToCamelCase<AttachmentRequest, AttachmentUI>(attachment);
};

export const convertUserActionsToCamelCase = (userActions: UserActions) => {
  return userActions.map((userAction) => {
    if (isCommentUserAction(userAction)) {
      const userActionWithoutPayload = omit(userAction, 'payload.comment');
      const camelCaseUserActionWithoutPayload = convertToCamelCase(userActionWithoutPayload);

      return {
        ...camelCaseUserActionWithoutPayload,
        payload: {
          comment: convertAttachmentToCamelCase(userAction.payload.comment),
        },
      };
    }

    return convertToCamelCase(userAction);
  });
};

const convertAttachmentToCamelExceptProperty = (
  attachment: AttachmentRequest,
  key: string
): AttachmentUI => {
  const intactValue = get(attachment, key);
  const attachmentWithoutIntactValue = omit(attachment, key);
  const camelCaseAttachmentWithoutIntactValue = convertToCamelCase(attachmentWithoutIntactValue);

  return {
    ...camelCaseAttachmentWithoutIntactValue,
    [key]: intactValue,
  } as AttachmentUI;
};

export const convertAllCasesToCamel = (snakeCases: CasesFindResponse): CasesFindResponseUI => ({
  cases: convertCasesToCamelCase(snakeCases.cases),
  countOpenCases: snakeCases.count_open_cases,
  countInProgressCases: snakeCases.count_in_progress_cases,
  countClosedCases: snakeCases.count_closed_cases,
  page: snakeCases.page,
  perPage: snakeCases.per_page,
  total: snakeCases.total,
});
