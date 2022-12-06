/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, set, camelCase, isObject, omit, get } from 'lodash';
import {
  isCommentRequestTypeExternalReference,
  isCommentRequestTypePersistableState,
} from '../../common/utils/attachments';
import type {
  CasesFindResponse,
  CaseResponse,
  CaseUserActionsResponse,
  CommentRequest,
  CommentResponse,
  CaseResolveResponse,
  CasesResponse,
} from '../../common/api';
import { isCommentUserAction } from '../../common/utils/user_actions';
import type { Cases, Case, Comment, ResolvedCase } from '../containers/types';

export const convertArrayToCamelCase = (arrayOfSnakes: unknown[]): unknown[] =>
  arrayOfSnakes.reduce((acc: unknown[], value) => {
    if (isArray(value)) {
      return [...acc, convertArrayToCamelCase(value)];
    } else if (isObject(value)) {
      return [...acc, convertToCamelCase(value)];
    } else {
      return [...acc, value];
    }
  }, []);

export const convertToCamelCase = <T, U extends {}>(obj: T): U =>
  Object.entries(obj).reduce((acc, [key, value]) => {
    if (isArray(value)) {
      set(acc, camelCase(key), convertArrayToCamelCase(value));
    } else if (isObject(value)) {
      set(acc, camelCase(key), convertToCamelCase(value));
    } else {
      set(acc, camelCase(key), value);
    }
    return acc;
  }, {} as U);

export const convertCaseToCamelCase = (theCase: CaseResponse): Case => {
  const { comments, ...restCase } = theCase;
  return {
    ...convertToCamelCase<CaseResponse, Case>(restCase),
    ...(comments != null ? { comments: convertAttachmentsToCamelCase(comments) } : {}),
  };
};

export const convertCasesToCamelCase = (cases: CasesResponse): Case[] =>
  cases.map(convertCaseToCamelCase);

export const convertCaseResolveToCamelCase = (res: CaseResolveResponse): ResolvedCase => {
  const { case: theCase, ...rest } = res;
  return {
    ...convertToCamelCase(rest),
    case: convertCaseToCamelCase(theCase),
  };
};

export const convertAttachmentsToCamelCase = (attachments: CommentResponse[]): Comment[] => {
  return attachments.map((attachment) => convertAttachmentToCamelCase(attachment));
};

export const convertAttachmentToCamelCase = (attachment: CommentRequest): Comment => {
  if (isCommentRequestTypeExternalReference(attachment)) {
    return convertAttachmentToCamelExceptProperty(attachment, 'externalReferenceMetadata');
  }

  if (isCommentRequestTypePersistableState(attachment)) {
    return convertAttachmentToCamelExceptProperty(attachment, 'persistableStateAttachmentState');
  }

  return convertToCamelCase<CommentRequest, Comment>(attachment);
};

export const convertUserActionsToCamelCase = (userActions: CaseUserActionsResponse) => {
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
  attachment: CommentRequest,
  key: string
): Comment => {
  const intactValue = get(attachment, key);
  const attachmentWithoutIntactValue = omit(attachment, key);
  const camelCaseAttachmentWithoutIntactValue = convertToCamelCase(attachmentWithoutIntactValue);

  return {
    ...camelCaseAttachmentWithoutIntactValue,
    [key]: intactValue,
  } as Comment;
};

export const convertAllCasesToCamel = (snakeCases: CasesFindResponse): Cases => ({
  cases: convertCasesToCamelCase(snakeCases.cases),
  countOpenCases: snakeCases.count_open_cases,
  countInProgressCases: snakeCases.count_in_progress_cases,
  countClosedCases: snakeCases.count_closed_cases,
  page: snakeCases.page,
  perPage: snakeCases.per_page,
  total: snakeCases.total,
});
