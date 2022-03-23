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
  SavedObjectsClientContract,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
  Logger,
} from 'src/core/server';
import { LensServerPluginSetup } from '../../../../lens/server';
import {
  CaseResponse,
  CaseResponseRt,
  CaseSettings,
  CaseStatuses,
  CommentAttributes,
  CommentPatchRequest,
  CommentRequest,
  CommentType,
  User,
  CommentRequestUserType,
  CaseAttributes,
} from '../../../common/api';
import { CASE_SAVED_OBJECT, MAX_DOCS_PER_PAGE } from '../../../common/constants';
import { AttachmentService, CasesService } from '../../services';
import { createCaseError } from '../error';
import {
  countAlertsForID,
  flattenCommentSavedObjects,
  transformNewComment,
  getOrUpdateLensReferences,
} from '../utils';

interface UpdateCommentResp {
  comment: SavedObjectsUpdateResponse<CommentAttributes>;
  commentableCase: CommentableCase;
}

interface NewCommentResp {
  comment: SavedObject<CommentAttributes>;
  commentableCase: CommentableCase;
}

interface CommentableCaseParams {
  caseInfo: SavedObject<CaseAttributes>;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  caseService: CasesService;
  attachmentService: AttachmentService;
  logger: Logger;
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
}

/**
 * This class represents a case that can have a comment attached to it.
 */
export class CommentableCase {
  private readonly caseInfo: SavedObject<CaseAttributes>;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private readonly caseService: CasesService;
  private readonly attachmentService: AttachmentService;
  private readonly logger: Logger;
  private readonly lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];

  constructor({
    caseInfo,
    unsecuredSavedObjectsClient,
    caseService,
    attachmentService,
    logger,
    lensEmbeddableFactory,
  }: CommentableCaseParams) {
    this.caseInfo = caseInfo;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.caseService = caseService;
    this.attachmentService = attachmentService;
    this.logger = logger;
    this.lensEmbeddableFactory = lensEmbeddableFactory;
  }

  public get status(): CaseStatuses {
    return this.caseInfo.attributes.status;
  }

  public get id(): string {
    return this.caseInfo.id;
  }

  public get settings(): CaseSettings {
    return this.caseInfo.attributes.settings;
  }

  public get caseId(): string {
    return this.caseInfo.id;
  }

  private get owner(): string {
    return this.caseInfo.attributes.owner;
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

  private async update({ date, user }: { date: string; user: User }): Promise<CommentableCase> {
    try {
      const updatedCase = await this.caseService.patchCase({
        originalCase: this.caseInfo,
        caseId: this.caseInfo.id,
        updatedAttributes: {
          updated_at: date,
          updated_by: { ...user },
        },
        version: this.caseInfo.version,
      });

      return new CommentableCase({
        caseInfo: {
          ...this.caseInfo,
          attributes: {
            ...this.caseInfo.attributes,
            ...updatedCase.attributes,
          },
          version: updatedCase.version ?? this.caseInfo.version,
        },
        unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
        caseService: this.caseService,
        attachmentService: this.attachmentService,
        logger: this.logger,
        lensEmbeddableFactory: this.lensEmbeddableFactory,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to update commentable case, case id: ${this.caseId}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  /**
   * Update a comment and update the corresponding case's update_at and updated_by fields.
   */
  public async updateComment({
    updateRequest,
    updatedAt,
    user,
  }: {
    updateRequest: CommentPatchRequest;
    updatedAt: string;
    user: User;
  }): Promise<UpdateCommentResp> {
    try {
      const { id, version, ...queryRestAttributes } = updateRequest;
      const options: SavedObjectsUpdateOptions<CommentAttributes> = {
        version,
      };

      if (queryRestAttributes.type === CommentType.user && queryRestAttributes?.comment) {
        const currentComment = (await this.attachmentService.get({
          unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
          attachmentId: id,
        })) as SavedObject<CommentRequestUserType>;

        const updatedReferences = getOrUpdateLensReferences(
          this.lensEmbeddableFactory,
          queryRestAttributes.comment,
          currentComment
        );
        options.references = updatedReferences;
      }

      const [comment, commentableCase] = await Promise.all([
        this.attachmentService.update({
          unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
          attachmentId: id,
          updatedAttributes: {
            ...queryRestAttributes,
            updated_at: updatedAt,
            updated_by: user,
          },
          options,
        }),
        this.update({ date: updatedAt, user }),
      ]);
      return {
        comment,
        commentableCase,
      };
    } catch (error) {
      throw createCaseError({
        message: `Failed to update comment in commentable case, case id: ${this.caseId}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  /**
   * Create a new comment on the appropriate case. This updates the case's updated_at and updated_by fields.
   */
  public async createComment({
    createdDate,
    user,
    commentReq,
    id,
  }: {
    createdDate: string;
    user: User;
    commentReq: CommentRequest;
    id: string;
  }): Promise<NewCommentResp> {
    try {
      if (commentReq.type === CommentType.alert) {
        if (this.status === CaseStatuses.closed) {
          throw Boom.badRequest('Alert cannot be attached to a closed case');
        }
      }

      if (commentReq.owner !== this.owner) {
        throw Boom.badRequest('The owner field of the comment must match the case');
      }

      let references = this.buildRefsToCase();

      if (commentReq.type === CommentType.user && commentReq?.comment) {
        const commentStringReferences = getOrUpdateLensReferences(
          this.lensEmbeddableFactory,
          commentReq.comment
        );
        references = [...references, ...commentStringReferences];
      }

      const [comment, commentableCase] = await Promise.all([
        this.attachmentService.create({
          unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
          attributes: transformNewComment({
            createdDate,
            ...commentReq,
            ...user,
          }),
          references,
          id,
        }),
        this.update({ date: createdDate, user }),
      ]);
      return {
        comment,
        commentableCase,
      };
    } catch (error) {
      throw createCaseError({
        message: `Failed creating a comment on a commentable case, case id: ${this.caseId}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }

  private formatForEncoding(totalComment: number) {
    return {
      id: this.caseInfo.id,
      version: this.caseInfo.version ?? '0',
      totalComment,
      ...this.caseInfo.attributes,
    };
  }

  public async encode(): Promise<CaseResponse> {
    try {
      const comments = await this.caseService.getAllCaseComments({
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
        message: `Failed encoding the commentable case, case id: ${this.caseId}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }
}
