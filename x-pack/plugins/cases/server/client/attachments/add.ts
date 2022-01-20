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

import { nodeBuilder } from '@kbn/es-query';
import {
  SavedObject,
  SavedObjectsClientContract,
  Logger,
  SavedObjectsUtils,
} from '../../../../../../src/core/server';
import { LensServerPluginSetup } from '../../../../lens/server';

import {
  AlertCommentRequestRt,
  CaseResponse,
  CaseStatuses,
  CaseType,
  CommentRequest,
  CommentRequestRt,
  CommentType,
  SubCaseAttributes,
  throwErrors,
  User,
} from '../../../common/api';
import {
  CASE_COMMENT_SAVED_OBJECT,
  ENABLE_CASE_CONNECTOR,
  MAX_GENERATED_ALERTS_PER_SUB_CASE,
} from '../../../common/constants';
import {
  buildCaseUserActionItem,
  buildCommentUserActionItem,
} from '../../services/user_actions/helpers';

import { AttachmentService, CasesService, CaseUserActionService } from '../../services';
import { CommentableCase } from '../../common/models';
import { createCaseError } from '../../common/error';
import { createAlertUpdateRequest, isCommentRequestTypeGenAlert } from '../../common/utils';
import { CasesClientArgs, CasesClientInternal } from '..';

import { decodeCommentRequest } from '../utils';
import { Operations } from '../../authorization';

async function getSubCase({
  caseService,
  unsecuredSavedObjectsClient,
  caseId,
  createdAt,
  userActionService,
  user,
}: {
  caseService: CasesService;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  caseId: string;
  createdAt: string;
  userActionService: CaseUserActionService;
  user: User;
}): Promise<SavedObject<SubCaseAttributes>> {
  const mostRecentSubCase = await caseService.getMostRecentSubCase(
    unsecuredSavedObjectsClient,
    caseId
  );
  if (mostRecentSubCase && mostRecentSubCase.attributes.status !== CaseStatuses.closed) {
    const subCaseAlertsAttachement = await caseService.getAllSubCaseComments({
      unsecuredSavedObjectsClient,
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
    unsecuredSavedObjectsClient,
    createdAt,
    caseId,
    createdBy: user,
  });
  await userActionService.bulkCreate({
    unsecuredSavedObjectsClient,
    actions: [
      buildCaseUserActionItem({
        action: 'create',
        actionAt: createdAt,
        actionBy: user,
        caseId,
        subCaseId: newSubCase.id,
        fields: ['status', 'sub_case'],
        newValue: { status: newSubCase.attributes.status },
        owner: newSubCase.attributes.owner,
      }),
    ],
  });
  return newSubCase;
}

const addGeneratedAlerts = async (
  { caseId, comment }: AddArgs,
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): Promise<CaseResponse> => {
  const {
    unsecuredSavedObjectsClient,
    attachmentService,
    caseService,
    userActionService,
    logger,
    lensEmbeddableFactory,
    authorization,
  } = clientArgs;

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
    const savedObjectID = SavedObjectsUtils.generateId();

    await authorization.ensureAuthorized({
      entities: [{ owner: comment.owner, id: savedObjectID }],
      operation: Operations.createComment,
    });

    const caseInfo = await caseService.getCase({
      unsecuredSavedObjectsClient,
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
      unsecuredSavedObjectsClient,
      caseId,
      createdAt: createdDate,
      userActionService,
      user: userDetails,
    });

    const commentableCase = new CommentableCase({
      logger,
      collection: caseInfo,
      subCase,
      unsecuredSavedObjectsClient,
      caseService,
      attachmentService,
      lensEmbeddableFactory,
    });

    const { comment: newComment, commentableCase: updatedCase } =
      await commentableCase.createComment({
        createdDate,
        user: userDetails,
        commentReq: query,
        id: savedObjectID,
      });

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
      unsecuredSavedObjectsClient,
      actions: [
        buildCommentUserActionItem({
          action: 'create',
          actionAt: createdDate,
          actionBy: { ...userDetails },
          caseId: updatedCase.caseId,
          subCaseId: updatedCase.subCaseId,
          commentId: newComment.id,
          fields: ['comment'],
          newValue: query,
          owner: newComment.attributes.owner,
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
  unsecuredSavedObjectsClient,
  id,
  logger,
  lensEmbeddableFactory,
}: {
  caseService: CasesService;
  attachmentService: AttachmentService;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  id: string;
  logger: Logger;
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
}): Promise<CommentableCase> {
  const [casePromise, subCasePromise] = await Promise.allSettled([
    caseService.getCase({
      unsecuredSavedObjectsClient,
      id,
    }),
    ...(ENABLE_CASE_CONNECTOR
      ? [
          caseService.getSubCase({
            unsecuredSavedObjectsClient,
            id,
          }),
        ]
      : [Promise.reject('case connector feature is disabled')]),
  ]);

  if (subCasePromise.status === 'fulfilled') {
    if (subCasePromise.value.references.length > 0) {
      const caseValue = await caseService.getCase({
        unsecuredSavedObjectsClient,
        id: subCasePromise.value.references[0].id,
      });
      return new CommentableCase({
        logger,
        collection: caseValue,
        subCase: subCasePromise.value,
        caseService,
        attachmentService,
        unsecuredSavedObjectsClient,
        lensEmbeddableFactory,
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
      unsecuredSavedObjectsClient,
      lensEmbeddableFactory,
    });
  }
}

/**
 * The arguments needed for creating a new attachment to a case.
 */
export interface AddArgs {
  /**
   * The case ID that this attachment will be associated with
   */
  caseId: string;
  /**
   * The attachment values.
   */
  comment: CommentRequest;
}

/**
 * Create an attachment to a case.
 *
 * @ignore
 */
export const addComment = async (
  addArgs: AddArgs,
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): Promise<CaseResponse> => {
  const { comment, caseId } = addArgs;
  const query = pipe(
    CommentRequestRt.decode(comment),
    fold(throwErrors(Boom.badRequest), identity)
  );

  const {
    unsecuredSavedObjectsClient,
    caseService,
    userActionService,
    attachmentService,
    user,
    logger,
    lensEmbeddableFactory,
    authorization,
  } = clientArgs;

  if (isCommentRequestTypeGenAlert(comment)) {
    if (!ENABLE_CASE_CONNECTOR) {
      throw Boom.badRequest(
        'Attempting to add a generated alert when case connector feature is disabled'
      );
    }

    return addGeneratedAlerts(addArgs, clientArgs, casesClientInternal);
  }

  decodeCommentRequest(comment);
  try {
    const savedObjectID = SavedObjectsUtils.generateId();

    await authorization.ensureAuthorized({
      operation: Operations.createComment,
      entities: [{ owner: comment.owner, id: savedObjectID }],
    });

    const createdDate = new Date().toISOString();

    const combinedCase = await getCombinedCase({
      caseService,
      attachmentService,
      unsecuredSavedObjectsClient,
      id: caseId,
      logger,
      lensEmbeddableFactory,
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
      id: savedObjectID,
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
      unsecuredSavedObjectsClient,
      actions: [
        buildCommentUserActionItem({
          action: 'create',
          actionAt: createdDate,
          actionBy: { username, full_name, email },
          caseId: updatedCase.caseId,
          subCaseId: updatedCase.subCaseId,
          commentId: newComment.id,
          fields: ['comment'],
          newValue: query,
          owner: newComment.attributes.owner,
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
