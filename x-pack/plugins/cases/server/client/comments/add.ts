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

import { SavedObject, SavedObjectsClientContract, Logger } from 'src/core/server';
import { decodeCommentRequest, isCommentRequestTypeGenAlert } from '../../routes/api/utils';

import {
  throwErrors,
  CommentRequestRt,
  CommentType,
  CaseStatuses,
  CaseType,
  SubCaseAttributes,
  CommentRequest,
  CaseResponse,
  User,
  CommentRequestAlertType,
  AlertCommentRequestRt,
} from '../../../common';
import {
  buildCaseUserActionItem,
  buildCommentUserActionItem,
} from '../../services/user_actions/helpers';

import { CaseServiceSetup, CaseUserActionServiceSetup } from '../../services';
import { CommentableCase, createAlertUpdateRequest } from '../../common';
import { CasesClientHandler } from '..';
import { createCaseError } from '../../common/error';
import { CASE_COMMENT_SAVED_OBJECT } from '../../saved_object_types';
import { ENABLE_CASE_CONNECTOR, MAX_GENERATED_ALERTS_PER_SUB_CASE } from '../../../common';

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
    const subCaseAlertsAttachement = await caseService.getAllSubCaseComments({
      client: savedObjectsClient,
      id: mostRecentSubCase.id,
      options: {
        fields: [],
        filter: `${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.generatedAlert}`,
        page: 1,
        perPage: 1,
      },
    });

    if (subCaseAlertsAttachement.total <= MAX_GENERATED_ALERTS_PER_SUB_CASE) {
      return mostRecentSubCase;
    }
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
  casesClient: CasesClientHandler;
  caseId: string;
  comment: CommentRequestAlertType;
  savedObjectsClient: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  userActionService: CaseUserActionServiceSetup;
  logger: Logger;
}

const addGeneratedAlerts = async ({
  savedObjectsClient,
  caseService,
  userActionService,
  casesClient,
  caseId,
  comment,
  logger,
}: AddCommentFromRuleArgs): Promise<CaseResponse> => {
  const query = pipe(
    AlertCommentRequestRt.decode(comment),
    fold(throwErrors(Boom.badRequest), identity)
  );

  decodeCommentRequest(comment);

  // This function only supports adding generated alerts
  if (comment.type !== CommentType.generatedAlert) {
    throw Boom.internal('Attempting to add a non generated alert in the wrong context');
  }

  try {
    const createdDate = new Date().toISOString();

    const caseInfo = await caseService.getCase({
      client: savedObjectsClient,
      id: caseId,
    });

    if (
      query.type === CommentType.generatedAlert &&
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
      logger,
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
      const alertsToUpdate = createAlertUpdateRequest({
        comment: query,
        status: subCase.attributes.status,
      });
      await casesClient.updateAlertsStatus({
        alerts: alertsToUpdate,
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
  } catch (error) {
    throw createCaseError({
      message: `Failed while adding a generated alert to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};

async function getCombinedCase({
  service,
  client,
  id,
  logger,
}: {
  service: CaseServiceSetup;
  client: SavedObjectsClientContract;
  id: string;
  logger: Logger;
}): Promise<CommentableCase> {
  const [casePromise, subCasePromise] = await Promise.allSettled([
    service.getCase({
      client,
      id,
    }),
    ...(ENABLE_CASE_CONNECTOR
      ? [
          service.getSubCase({
            client,
            id,
          }),
        ]
      : [Promise.reject('case connector feature is disabled')]),
  ]);

  if (subCasePromise.status === 'fulfilled') {
    if (subCasePromise.value.references.length > 0) {
      const caseValue = await service.getCase({
        client,
        id: subCasePromise.value.references[0].id,
      });
      return new CommentableCase({
        logger,
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
    return new CommentableCase({
      logger,
      collection: casePromise.value,
      service,
      soClient: client,
    });
  }
}

interface AddCommentArgs {
  casesClient: CasesClientHandler;
  caseId: string;
  comment: CommentRequest;
  savedObjectsClient: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  userActionService: CaseUserActionServiceSetup;
  user: User;
  logger: Logger;
}

export const addComment = async ({
  savedObjectsClient,
  caseService,
  userActionService,
  casesClient,
  caseId,
  comment,
  user,
  logger,
}: AddCommentArgs): Promise<CaseResponse> => {
  const query = pipe(
    CommentRequestRt.decode(comment),
    fold(throwErrors(Boom.badRequest), identity)
  );

  if (isCommentRequestTypeGenAlert(comment)) {
    if (!ENABLE_CASE_CONNECTOR) {
      throw Boom.badRequest(
        'Attempting to add a generated alert when case connector feature is disabled'
      );
    }

    return addGeneratedAlerts({
      caseId,
      comment,
      casesClient,
      savedObjectsClient,
      userActionService,
      caseService,
      logger,
    });
  }

  decodeCommentRequest(comment);
  try {
    const createdDate = new Date().toISOString();

    const combinedCase = await getCombinedCase({
      service: caseService,
      client: savedObjectsClient,
      id: caseId,
      logger,
    });

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
      const alertsToUpdate = createAlertUpdateRequest({
        comment: query,
        status: updatedCase.status,
      });

      await casesClient.updateAlertsStatus({
        alerts: alertsToUpdate,
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
  } catch (error) {
    throw createCaseError({
      message: `Failed while adding a comment to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};
