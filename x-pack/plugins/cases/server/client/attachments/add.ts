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

import { PublicMethodsOf } from '@kbn/utility-types';
import {
  SavedObject,
  SavedObjectsClientContract,
  Logger,
  SavedObjectsUtils,
} from '../../../../../../src/core/server';
import { nodeBuilder } from '../../../../../../src/plugins/data/common';

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
} from '../../../common/api';
import {
  buildCaseUserActionItem,
  buildCommentUserActionItem,
} from '../../services/user_actions/helpers';

import { AttachmentService, CaseService, CaseUserActionService } from '../../services';
import {
  CommentableCase,
  createAlertUpdateRequest,
  isCommentRequestTypeGenAlert,
} from '../../common';
import { CasesClientArgs, CasesClientInternal } from '..';
import { createCaseError } from '../../common/error';
import {
  MAX_GENERATED_ALERTS_PER_SUB_CASE,
  CASE_COMMENT_SAVED_OBJECT,
  ENABLE_CASE_CONNECTOR,
} from '../../../common/constants';

import { decodeCommentRequest, ensureAuthorized } from '../utils';
import { AuditLogger } from '../../../../security/server';
import { Authorization, Operations } from '../../authorization';

async function getSubCase({
  caseService,
  savedObjectsClient,
  caseId,
  createdAt,
  userActionService,
  user,
  owner,
}: {
  caseService: CaseService;
  savedObjectsClient: SavedObjectsClientContract;
  caseId: string;
  createdAt: string;
  userActionService: CaseUserActionService;
  user: User;
  owner: string;
}): Promise<SavedObject<SubCaseAttributes>> {
  const mostRecentSubCase = await caseService.getMostRecentSubCase(savedObjectsClient, caseId);
  if (mostRecentSubCase && mostRecentSubCase.attributes.status !== CaseStatuses.closed) {
    const subCaseAlertsAttachement = await caseService.getAllSubCaseComments({
      soClient: savedObjectsClient,
      id: mostRecentSubCase.id,
      options: {
        fields: [],
        filter: nodeBuilder.is(
          `${CASE_COMMENT_SAVED_OBJECT}.attributes.type`,
          CommentType.generatedAlert
        ),
        page: 1,
        perPage: 1,
      },
    });

    if (subCaseAlertsAttachement.total <= MAX_GENERATED_ALERTS_PER_SUB_CASE) {
      return mostRecentSubCase;
    }
  }

  const newSubCase = await caseService.createSubCase({
    soClient: savedObjectsClient,
    createdAt,
    caseId,
    createdBy: user,
    owner,
  });

  await userActionService.bulkCreate({
    soClient: savedObjectsClient,
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
  casesClientInternal: CasesClientInternal;
  caseId: string;
  comment: CommentRequestAlertType;
  savedObjectsClient: SavedObjectsClientContract;
  attachmentService: AttachmentService;
  caseService: CaseService;
  userActionService: CaseUserActionService;
  logger: Logger;
  auditLogger?: AuditLogger;
  authorization: PublicMethodsOf<Authorization>;
}

const addGeneratedAlerts = async ({
  savedObjectsClient,
  attachmentService,
  caseService,
  userActionService,
  casesClientInternal,
  caseId,
  comment,
  logger,
  auditLogger,
  authorization,
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
      soClient: savedObjectsClient,
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

    const savedObjectID = SavedObjectsUtils.generateId();

    await ensureAuthorized({
      operation: Operations.createSubCase,
      entities: [{ owner: caseInfo.attributes.owner, id: savedObjectID }],
      authorization,
      auditLogger,
    });

    const subCase = await getSubCase({
      caseService,
      savedObjectsClient,
      caseId,
      createdAt: createdDate,
      userActionService,
      user: userDetails,
      owner: caseInfo.attributes.owner,
    });

    const commentableCase = new CommentableCase({
      logger,
      collection: caseInfo,
      subCase,
      soClient: savedObjectsClient,
      caseService,
      attachmentService,
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
      await casesClientInternal.alerts.updateStatus({
        alerts: alertsToUpdate,
      });
    }

    await userActionService.bulkCreate({
      soClient: savedObjectsClient,
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
  caseService,
  attachmentService,
  soClient,
  id,
  logger,
}: {
  caseService: CaseService;
  attachmentService: AttachmentService;
  soClient: SavedObjectsClientContract;
  id: string;
  logger: Logger;
}): Promise<CommentableCase> {
  const [casePromise, subCasePromise] = await Promise.allSettled([
    caseService.getCase({
      soClient,
      id,
    }),
    ...(ENABLE_CASE_CONNECTOR
      ? [
          caseService.getSubCase({
            soClient,
            id,
          }),
        ]
      : [Promise.reject('case connector feature is disabled')]),
  ]);

  if (subCasePromise.status === 'fulfilled') {
    if (subCasePromise.value.references.length > 0) {
      const caseValue = await caseService.getCase({
        soClient,
        id: subCasePromise.value.references[0].id,
      });
      return new CommentableCase({
        logger,
        collection: caseValue,
        subCase: subCasePromise.value,
        caseService,
        attachmentService,
        soClient,
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
      caseService,
      attachmentService,
      soClient,
    });
  }
}

interface AddCommentArgs {
  caseId: string;
  comment: CommentRequest;
  casesClientInternal: CasesClientInternal;
}

export const addComment = async ({
  caseId,
  comment,
  casesClientInternal,
  ...rest
}: AddCommentArgs & CasesClientArgs): Promise<CaseResponse> => {
  const query = pipe(
    CommentRequestRt.decode(comment),
    fold(throwErrors(Boom.badRequest), identity)
  );

  const {
    savedObjectsClient,
    caseService,
    userActionService,
    attachmentService,
    user,
    logger,
    auditLogger,
    authorization,
  } = rest;

  if (isCommentRequestTypeGenAlert(comment)) {
    if (!ENABLE_CASE_CONNECTOR) {
      throw Boom.badRequest(
        'Attempting to add a generated alert when case connector feature is disabled'
      );
    }

    return addGeneratedAlerts({
      caseId,
      comment,
      casesClientInternal,
      savedObjectsClient,
      userActionService,
      caseService,
      attachmentService,
      logger,
      auditLogger,
      authorization,
    });
  }

  decodeCommentRequest(comment);
  try {
    const createdDate = new Date().toISOString();

    const combinedCase = await getCombinedCase({
      caseService,
      attachmentService,
      soClient: savedObjectsClient,
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

      await casesClientInternal.alerts.updateStatus({
        alerts: alertsToUpdate,
      });
    }

    await userActionService.bulkCreate({
      soClient: savedObjectsClient,
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
