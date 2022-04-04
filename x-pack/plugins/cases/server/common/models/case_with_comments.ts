/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';

import {
  SavedObject,
  SavedObjectReference,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from 'src/core/server';
import {
  CaseResponse,
  CaseResponseRt,
  CaseStatuses,
  CommentAttributes,
  CommentPatchRequest,
  CommentRequest,
  CommentType,
  CommentRequestUserType,
  CaseAttributes,
  ActionTypes,
  Actions,
} from '../../../common/api';
import { CASE_SAVED_OBJECT, MAX_DOCS_PER_PAGE } from '../../../common/constants';
import { CasesClientArgs } from '../../client';
import { createCaseError } from '../error';
import {
  countAlertsForID,
  flattenCommentSavedObjects,
  transformNewComment,
  getOrUpdateLensReferences,
  createAlertUpdateRequest,
} from '../utils';

type CaseCommentModelParams = Omit<CasesClientArgs, 'authorization'>;

/**
 * This class represents a case that can have a comment attached to it.
 */
export class CaseCommentModel {
  private readonly params: CaseCommentModelParams;
  private readonly caseInfo: SavedObject<CaseAttributes>;

  private constructor(caseInfo: SavedObject<CaseAttributes>, params: CaseCommentModelParams) {
    this.caseInfo = caseInfo;
    this.params = params;
  }

  public static async create(
    id: string,
    options: CaseCommentModelParams
  ): Promise<CaseCommentModel> {
    const savedObject = await options.caseService.getCase({
      id,
    });

    return new CaseCommentModel(savedObject, options);
  }

  public get savedObject(): SavedObject<CaseAttributes> {
    return this.caseInfo;
  }

  /**
   * Update a comment and update the corresponding case's update_at and updated_by fields.
   */
  public async updateComment({
    updateRequest,
    updatedAt,
    owner,
  }: {
    updateRequest: CommentPatchRequest;
    updatedAt: string;
    owner: string;
  }): Promise<CaseCommentModel> {
    try {
      const { id, version, ...queryRestAttributes } = updateRequest;
      const options: SavedObjectsUpdateOptions<CommentAttributes> = {
        version,
      };

      if (queryRestAttributes.type === CommentType.user && queryRestAttributes?.comment) {
        const currentComment = (await this.params.attachmentService.get({
          unsecuredSavedObjectsClient: this.params.unsecuredSavedObjectsClient,
          attachmentId: id,
        })) as SavedObject<CommentRequestUserType>;

        const updatedReferences = getOrUpdateLensReferences(
          this.params.lensEmbeddableFactory,
          queryRestAttributes.comment,
          currentComment
        );
        options.references = updatedReferences;
      }

      const [comment, commentableCase] = await Promise.all([
        this.params.attachmentService.update({
          unsecuredSavedObjectsClient: this.params.unsecuredSavedObjectsClient,
          attachmentId: id,
          updatedAttributes: {
            ...queryRestAttributes,
            updated_at: updatedAt,
            updated_by: this.params.user,
          },
          options,
        }),
        this.updateCaseUserAndDate(updatedAt),
      ]);

      await commentableCase.createUpdateCommentUserAction(comment, updateRequest, owner);

      return commentableCase;
    } catch (error) {
      throw createCaseError({
        message: `Failed to update comment in commentable case, case id: ${this.caseInfo.id}: ${error}`,
        error,
        logger: this.params.logger,
      });
    }
  }

  private async updateCaseUserAndDate(date: string): Promise<CaseCommentModel> {
    try {
      const updatedCase = await this.params.caseService.patchCase({
        originalCase: this.caseInfo,
        caseId: this.caseInfo.id,
        updatedAttributes: {
          updated_at: date,
          updated_by: { ...this.params.user },
        },
        version: this.caseInfo.version,
      });

      return this.newObjectWithInfo({
        ...this.caseInfo,
        attributes: {
          ...this.caseInfo.attributes,
          ...updatedCase.attributes,
        },
        version: updatedCase.version ?? this.caseInfo.version,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to update commentable case, case id: ${this.caseInfo.id}: ${error}`,
        error,
        logger: this.params.logger,
      });
    }
  }

  private newObjectWithInfo(caseInfo: SavedObject<CaseAttributes>): CaseCommentModel {
    return new CaseCommentModel(caseInfo, this.params);
  }

  private async createUpdateCommentUserAction(
    comment: SavedObjectsUpdateResponse<CommentAttributes>,
    updateRequest: CommentPatchRequest,
    owner: string
  ) {
    const { id, version, ...queryRestAttributes } = updateRequest;

    await this.params.userActionService.createUserAction({
      type: ActionTypes.comment,
      action: Actions.update,
      unsecuredSavedObjectsClient: this.params.unsecuredSavedObjectsClient,
      caseId: this.caseInfo.id,
      attachmentId: comment.id,
      payload: { attachment: queryRestAttributes },
      user: this.params.user,
      owner,
    });
  }

  /**
   * Create a new comment on the appropriate case. This updates the case's updated_at and updated_by fields.
   */
  public async createComment({
    createdDate,
    commentReq,
    id,
  }: {
    createdDate: string;
    commentReq: CommentRequest;
    id: string;
  }): Promise<CaseCommentModel> {
    try {
      this.validateCreateCommentRequest(commentReq);

      let references = this.buildRefsToCase();

      if (commentReq.type === CommentType.user && commentReq?.comment) {
        const commentStringReferences = getOrUpdateLensReferences(
          this.params.lensEmbeddableFactory,
          commentReq.comment
        );
        references = [...references, ...commentStringReferences];
      }

      const [comment, commentableCase] = await Promise.all([
        this.params.attachmentService.create({
          unsecuredSavedObjectsClient: this.params.unsecuredSavedObjectsClient,
          attributes: transformNewComment({
            createdDate,
            ...commentReq,
            ...this.params.user,
          }),
          references,
          id,
        }),
        this.updateCaseUserAndDate(createdDate),
      ]);

      await Promise.all([
        commentableCase.handleAlertComments(comment, commentReq),
        this.createCommentUserAction(comment, commentReq),
      ]);

      return commentableCase;
    } catch (error) {
      throw createCaseError({
        message: `Failed creating a comment on a commentable case, case id: ${this.caseInfo.id}: ${error}`,
        error,
        logger: this.params.logger,
      });
    }
  }

  private validateCreateCommentRequest(req: CommentRequest) {
    if (req.type === CommentType.alert && this.caseInfo.attributes.status === CaseStatuses.closed) {
      throw Boom.badRequest('Alert cannot be attached to a closed case');
    }

    if (req.owner !== this.caseInfo.attributes.owner) {
      throw Boom.badRequest('The owner field of the comment must match the case');
    }
  }

  private buildRefsToCase(): SavedObjectReference[] {
    return [
      {
        type: CASE_SAVED_OBJECT,
        name: `associated-${CASE_SAVED_OBJECT}`,
        id: this.caseInfo.id,
      },
    ];
  }

  private async handleAlertComments(comment: SavedObject<CommentAttributes>, req: CommentRequest) {
    if (
      comment.attributes.type === CommentType.alert &&
      this.caseInfo.attributes.settings.syncAlerts
    ) {
      await this.updateAlertsStatus(req);
    }
  }

  private async updateAlertsStatus(req: CommentRequest) {
    const alertsToUpdate = createAlertUpdateRequest({
      comment: req,
      status: this.caseInfo.attributes.status,
    });

    await this.params.alertsService.updateAlertsStatus(alertsToUpdate);
  }

  private async createCommentUserAction(
    comment: SavedObject<CommentAttributes>,
    req: CommentRequest
  ) {
    await this.params.userActionService.createUserAction({
      type: ActionTypes.comment,
      action: Actions.create,
      unsecuredSavedObjectsClient: this.params.unsecuredSavedObjectsClient,
      caseId: this.caseInfo.id,
      attachmentId: comment.id,
      payload: {
        attachment: req,
      },
      user: this.params.user,
      owner: comment.attributes.owner,
    });
  }

  private formatForEncoding(totalComment: number) {
    return {
      id: this.caseInfo.id,
      version: this.caseInfo.version ?? '0',
      totalComment,
      ...this.caseInfo.attributes,
    };
  }

  public async encodeWithComments(): Promise<CaseResponse> {
    try {
      const comments = await this.params.caseService.getAllCaseComments({
        id: this.caseInfo.id,
        options: {
          fields: [],
          page: 1,
          perPage: MAX_DOCS_PER_PAGE,
        },
      });

      const totalAlerts = countAlertsForID({ comments, id: this.caseInfo.id }) ?? 0;

      const caseResponse = {
        comments: flattenCommentSavedObjects(comments.saved_objects),
        totalAlerts,
        ...this.formatForEncoding(comments.total),
      };

      return CaseResponseRt.encode(caseResponse);
    } catch (error) {
      throw createCaseError({
        message: `Failed encoding the commentable case, case id: ${this.caseInfo.id}: ${error}`,
        error,
        logger: this.params.logger,
      });
    }
  }
}
