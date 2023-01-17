/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';

import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import type {
  CaseResponse,
  CommentAttributes,
  CommentPatchRequest,
  CommentRequest,
  CommentRequestUserType,
  CommentRequestAlertType,
} from '../../../common/api';
import {
  CaseResponseRt,
  CaseStatuses,
  CommentType,
  ActionTypes,
  Actions,
} from '../../../common/api';
import {
  CASE_SAVED_OBJECT,
  MAX_ALERTS_PER_CASE,
  MAX_DOCS_PER_PAGE,
} from '../../../common/constants';
import type { CasesClientArgs } from '../../client';
import type { RefreshSetting } from '../../services/types';
import { createCaseError } from '../error';
import type { CaseSavedObject } from '../types';
import {
  countAlertsForID,
  flattenCommentSavedObjects,
  transformNewComment,
  getOrUpdateLensReferences,
  createAlertUpdateStatusRequest,
  isCommentRequestTypeAlert,
  getAlertInfoFromComments,
} from '../utils';

type CaseCommentModelParams = Omit<CasesClientArgs, 'authorization'>;

const ALERT_LIMIT_MSG = `Case has reached the maximum allowed number (${MAX_ALERTS_PER_CASE}) of attached alerts.`;

/**
 * This class represents a case that can have a comment attached to it.
 */
export class CaseCommentModel {
  private readonly params: CaseCommentModelParams;
  private readonly caseInfo: CaseSavedObject;

  private constructor(caseInfo: CaseSavedObject, params: CaseCommentModelParams) {
    this.caseInfo = caseInfo;
    this.params = params;
  }

  public static async create(
    id: string,
    options: CaseCommentModelParams
  ): Promise<CaseCommentModel> {
    const savedObject = await options.services.caseService.getCase({
      id,
    });

    return new CaseCommentModel(savedObject, options);
  }

  public get savedObject(): CaseSavedObject {
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
        refresh: false,
      };

      if (queryRestAttributes.type === CommentType.user && queryRestAttributes?.comment) {
        const currentComment = (await this.params.services.attachmentService.get({
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
        this.params.services.attachmentService.update({
          unsecuredSavedObjectsClient: this.params.unsecuredSavedObjectsClient,
          attachmentId: id,
          updatedAttributes: {
            ...queryRestAttributes,
            updated_at: updatedAt,
            updated_by: this.params.user,
          },
          options,
        }),
        this.updateCaseUserAndDateSkipRefresh(updatedAt),
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

  private async updateCaseUserAndDateSkipRefresh(date: string) {
    return this.updateCaseUserAndDate(date, false);
  }

  private async updateCaseUserAndDate(
    date: string,
    refresh: RefreshSetting
  ): Promise<CaseCommentModel> {
    try {
      const updatedCase = await this.params.services.caseService.patchCase({
        originalCase: this.caseInfo,
        caseId: this.caseInfo.id,
        updatedAttributes: {
          updated_at: date,
          updated_by: { ...this.params.user },
        },
        version: this.caseInfo.version,
        refresh,
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

  private newObjectWithInfo(caseInfo: CaseSavedObject): CaseCommentModel {
    return new CaseCommentModel(caseInfo, this.params);
  }

  private async createUpdateCommentUserAction(
    comment: SavedObjectsUpdateResponse<CommentAttributes>,
    updateRequest: CommentPatchRequest,
    owner: string
  ) {
    const { id, version, ...queryRestAttributes } = updateRequest;

    await this.params.services.userActionService.createUserAction({
      type: ActionTypes.comment,
      action: Actions.update,
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
      await this.validateCreateCommentRequest([commentReq]);

      const references = [...this.buildRefsToCase(), ...this.getCommentReferences(commentReq)];

      const [comment, commentableCase] = await Promise.all([
        this.params.services.attachmentService.create({
          unsecuredSavedObjectsClient: this.params.unsecuredSavedObjectsClient,
          attributes: transformNewComment({
            createdDate,
            ...commentReq,
            ...this.params.user,
          }),
          references,
          id,
          refresh: false,
        }),
        this.updateCaseUserAndDateSkipRefresh(createdDate),
      ]);

      await Promise.all([
        commentableCase.handleAlertComments([commentReq]),
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

  private async validateCreateCommentRequest(req: CommentRequest[]) {
    const totalAlertsInReq = req
      .filter<CommentRequestAlertType>(isCommentRequestTypeAlert)
      .reduce((count, attachment) => {
        const ids = Array.isArray(attachment.alertId) ? attachment.alertId : [attachment.alertId];
        return count + ids.length;
      }, 0);

    const reqHasAlerts = totalAlertsInReq > 0;

    if (reqHasAlerts && this.caseInfo.attributes.status === CaseStatuses.closed) {
      throw Boom.badRequest('Alert cannot be attached to a closed case');
    }

    if (req.some((attachment) => attachment.owner !== this.caseInfo.attributes.owner)) {
      throw Boom.badRequest('The owner field of the comment must match the case');
    }

    if (reqHasAlerts) {
      /**
       * This check is for optimization reasons.
       * It saves one aggregation if the total number
       * of alerts of the request is already greater than
       * MAX_ALERTS_PER_CASE
       */
      if (totalAlertsInReq > MAX_ALERTS_PER_CASE) {
        throw Boom.badRequest(ALERT_LIMIT_MSG);
      }

      await this.validateAlertsLimitOnCase(totalAlertsInReq);
    }
  }

  private async validateAlertsLimitOnCase(totalAlertsInReq: number) {
    const alertsValueCount =
      await this.params.services.attachmentService.valueCountAlertsAttachedToCase({
        unsecuredSavedObjectsClient: this.params.unsecuredSavedObjectsClient,
        caseId: this.caseInfo.id,
      });

    if (alertsValueCount + totalAlertsInReq > MAX_ALERTS_PER_CASE) {
      throw Boom.badRequest(ALERT_LIMIT_MSG);
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

  private getCommentReferences(commentReq: CommentRequest) {
    let references: SavedObjectReference[] = [];

    if (commentReq.type === CommentType.user && commentReq?.comment) {
      const commentStringReferences = getOrUpdateLensReferences(
        this.params.lensEmbeddableFactory,
        commentReq.comment
      );
      references = [...references, ...commentStringReferences];
    }

    return references;
  }

  private async handleAlertComments(attachments: CommentRequest[]) {
    const alertAttachments = attachments.filter(
      (attachment): attachment is CommentRequestAlertType => attachment.type === CommentType.alert
    );

    if (this.caseInfo.attributes.settings.syncAlerts) {
      await this.updateAlertsStatus(alertAttachments);
    }

    if (alertAttachments.length > 0) {
      await this.updateAlertsSchemaWithCaseInfo(alertAttachments);
    }
  }

  private async updateAlertsStatus(alerts: CommentRequest[]) {
    const alertsToUpdate = alerts
      .map((alert) =>
        createAlertUpdateStatusRequest({
          comment: alert,
          status: this.caseInfo.attributes.status,
        })
      )
      .flat();

    await this.params.services.alertsService.updateAlertsStatus(alertsToUpdate);
  }

  private async updateAlertsSchemaWithCaseInfo(alertAttachments: CommentRequestAlertType[]) {
    const alerts = getAlertInfoFromComments(alertAttachments);

    await this.params.services.alertsService.bulkUpdateCases({
      alerts,
      caseIds: [this.caseInfo.id],
    });
  }

  private async createCommentUserAction(
    comment: SavedObject<CommentAttributes>,
    req: CommentRequest
  ) {
    await this.params.services.userActionService.createUserAction({
      type: ActionTypes.comment,
      action: Actions.create,
      caseId: this.caseInfo.id,
      attachmentId: comment.id,
      payload: {
        attachment: req,
      },
      user: this.params.user,
      owner: comment.attributes.owner,
    });
  }

  private async bulkCreateCommentUserAction(attachments: Array<{ id: string } & CommentRequest>) {
    await this.params.services.userActionService.bulkCreateAttachmentCreation({
      caseId: this.caseInfo.id,
      attachments: attachments.map(({ id, ...attachment }) => ({
        id,
        owner: attachment.owner,
        attachment,
      })),
      user: this.params.user,
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
      const comments = await this.params.services.caseService.getAllCaseComments({
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

  public async bulkCreate({
    attachments,
  }: {
    attachments: Array<{ id: string } & CommentRequest>;
  }): Promise<CaseCommentModel> {
    try {
      await this.validateCreateCommentRequest(attachments);

      const caseReference = this.buildRefsToCase();

      const [newlyCreatedAttachments, commentableCase] = await Promise.all([
        this.params.services.attachmentService.bulkCreate({
          unsecuredSavedObjectsClient: this.params.unsecuredSavedObjectsClient,
          attachments: attachments.map(({ id, ...attachment }) => {
            return {
              attributes: transformNewComment({
                createdDate: new Date().toISOString(),
                ...attachment,
                ...this.params.user,
              }),
              references: [...caseReference, ...this.getCommentReferences(attachment)],
              id,
            };
          }),
          refresh: false,
        }),
        this.updateCaseUserAndDateSkipRefresh(new Date().toISOString()),
      ]);

      const savedObjectsWithoutErrors = newlyCreatedAttachments.saved_objects.filter(
        (attachment) => attachment.error == null
      );

      const attachmentsWithoutErrors = attachments.filter((attachment) =>
        savedObjectsWithoutErrors.some((so) => so.id === attachment.id)
      );

      await Promise.all([
        commentableCase.handleAlertComments(attachmentsWithoutErrors),
        this.bulkCreateCommentUserAction(attachmentsWithoutErrors),
      ]);

      return commentableCase;
    } catch (error) {
      throw createCaseError({
        message: `Failed bulk creating attachments on a commentable case, case id: ${this.caseInfo.id}: ${error}`,
        error,
        logger: this.params.logger,
      });
    }
  }
}
