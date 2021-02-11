/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import {
  decodeCommentRequest,
  getAlertIdsFromRequest,
  isCommentRequestTypeGenAlert,
} from '../../routes/api/utils';

import {
  throwErrors,
  CommentRequestRt,
  CommentType,
  CaseStatuses,
  CaseType,
  SubCaseAttributes,
  CommentRequest,
  CollectionWithSubCaseResponse,
  GeneratedAlertCommentRequestRt,
  CommentRequestGeneratedAlertType,
  User,
  GeneratedAlertRequestTypeField,
} from '../../../common/api';
import {
  buildCaseUserActionItem,
  buildCommentUserActionItem,
} from '../../services/user_actions/helpers';

import { CaseServiceSetup, CaseUserActionServiceSetup } from '../../services';
import { CommentableCase } from '../../common';
import { CaseClientImpl } from '..';

async function getSubCase({
  caseService,
  savedObjectsClient,
  caseId,
  createdAt,
  userActionService,
  user,
}: {
  caseService: CaseServiceSetup;
  savedObjectsClient: SavedObjectsClientContract;
  caseId: string;
  createdAt: string;
  userActionService: CaseUserActionServiceSetup;
  user: User;
}): Promise<SavedObject<SubCaseAttributes>> {
  const mostRecentSubCase = await caseService.getMostRecentSubCase(savedObjectsClient, caseId);
  if (mostRecentSubCase && mostRecentSubCase.attributes.status !== CaseStatuses.closed) {
    return mostRecentSubCase;
  }

  const newSubCase = await caseService.createSubCase({
    client: savedObjectsClient,
    createdAt,
    caseId,
    createdBy: user,
  });
  await userActionService.postUserActions({
    client: savedObjectsClient,
    actions: [
      buildCaseUserActionItem({
        action: 'create',
        actionAt: createdAt,
        actionBy: user,
        caseId,
        subCaseId: newSubCase.id,
        fields: ['status', 'sub_case'],
        newValue: JSON.stringify({ status: newSubCase.attributes.status }),
      }),
    ],
  });
  return newSubCase;
}

interface AddCommentFromRuleArgs {
  caseClient: CaseClientImpl;
  caseId: string;
  comment: CommentRequestGeneratedAlertType;
  savedObjectsClient: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  userActionService: CaseUserActionServiceSetup;
}

const addGeneratedAlerts = async ({
  savedObjectsClient,
  caseService,
  userActionService,
  caseClient,
  caseId,
  comment,
}: AddCommentFromRuleArgs): Promise<CollectionWithSubCaseResponse> => {
  const query = pipe(
    GeneratedAlertCommentRequestRt.decode(comment),
    fold(throwErrors(Boom.badRequest), identity)
  );

  decodeCommentRequest(comment);
  const createdDate = new Date().toISOString();

  const caseInfo = await caseService.getCase({
    client: savedObjectsClient,
    id: caseId,
  });

  if (
    query.type === GeneratedAlertRequestTypeField &&
    caseInfo.attributes.type !== CaseType.collection
  ) {
    throw Boom.badRequest('Sub case style alert comment cannot be added to an individual case');
  }

  const userDetails: User = {
    username: caseInfo.attributes.created_by?.username,
    full_name: caseInfo.attributes.created_by?.full_name,
    email: caseInfo.attributes.created_by?.email,
  };

  const subCase = await getSubCase({
    caseService,
    savedObjectsClient,
    caseId,
    createdAt: createdDate,
    userActionService,
    user: userDetails,
  });

  const commentableCase = new CommentableCase({
    collection: caseInfo,
    subCase,
    soClient: savedObjectsClient,
    service: caseService,
  });

  const {
    comment: newComment,
    commentableCase: updatedCase,
  } = await commentableCase.createComment({ createdDate, user: userDetails, commentReq: query });

  if (
    (newComment.attributes.type === CommentType.alert ||
      newComment.attributes.type === CommentType.generatedAlert) &&
    caseInfo.attributes.settings.syncAlerts
  ) {
    const ids = getAlertIdsFromRequest(query);
    await caseClient.updateAlertsStatus({
      ids,
      status: subCase.attributes.status,
      indices: new Set([newComment.attributes.index]),
    });
  }

  await userActionService.postUserActions({
    client: savedObjectsClient,
    actions: [
      buildCommentUserActionItem({
        action: 'create',
        actionAt: createdDate,
        actionBy: { ...userDetails },
        caseId: updatedCase.caseId,
        subCaseId: updatedCase.subCaseId,
        commentId: newComment.id,
        fields: ['comment'],
        newValue: JSON.stringify(query),
      }),
    ],
  });

  return updatedCase.encode();
};

async function getCombinedCase(
  service: CaseServiceSetup,
  client: SavedObjectsClientContract,
  id: string
): Promise<CommentableCase> {
  const [casePromise, subCasePromise] = await Promise.allSettled([
    service.getCase({
      client,
      id,
    }),
    service.getSubCase({
      client,
      id,
    }),
  ]);

  if (subCasePromise.status === 'fulfilled') {
    if (subCasePromise.value.references.length > 0) {
      const caseValue = await service.getCase({
        client,
        id: subCasePromise.value.references[0].id,
      });
      return new CommentableCase({
        collection: caseValue,
        subCase: subCasePromise.value,
        service,
        soClient: client,
      });
    } else {
      throw Boom.badRequest('Sub case found without reference to collection');
    }
  }

  if (casePromise.status === 'rejected') {
    throw casePromise.reason;
  } else {
    return new CommentableCase({ collection: casePromise.value, service, soClient: client });
  }
}

interface AddCommentArgs {
  caseClient: CaseClientImpl;
  caseId: string;
  comment: CommentRequest;
  savedObjectsClient: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  userActionService: CaseUserActionServiceSetup;
  user: User;
}

export const addComment = async ({
  savedObjectsClient,
  caseService,
  userActionService,
  caseClient,
  caseId,
  comment,
  user,
}: AddCommentArgs): Promise<CollectionWithSubCaseResponse> => {
  const query = pipe(
    CommentRequestRt.decode(comment),
    fold(throwErrors(Boom.badRequest), identity)
  );

  if (isCommentRequestTypeGenAlert(comment)) {
    return addGeneratedAlerts({
      caseId,
      comment,
      caseClient,
      savedObjectsClient,
      userActionService,
      caseService,
    });
  }

  decodeCommentRequest(comment);
  const createdDate = new Date().toISOString();

  const combinedCase = await getCombinedCase(caseService, savedObjectsClient, caseId);

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { username, full_name, email } = user;
  const userInfo: User = {
    username,
    full_name,
    email,
  };

  const { comment: newComment, commentableCase: updatedCase } = await combinedCase.createComment({
    createdDate,
    user: userInfo,
    commentReq: query,
  });

  if (newComment.attributes.type === CommentType.alert && updatedCase.settings.syncAlerts) {
    const ids = getAlertIdsFromRequest(query);
    await caseClient.updateAlertsStatus({
      ids,
      status: updatedCase.status,
      indices: new Set([newComment.attributes.index]),
    });
  }

  await userActionService.postUserActions({
    client: savedObjectsClient,
    actions: [
      buildCommentUserActionItem({
        action: 'create',
        actionAt: createdDate,
        actionBy: { username, full_name, email },
        caseId: updatedCase.caseId,
        subCaseId: updatedCase.subCaseId,
        commentId: newComment.id,
        fields: ['comment'],
        newValue: JSON.stringify(query),
      }),
    ],
  });

  return updatedCase.encode();
};
