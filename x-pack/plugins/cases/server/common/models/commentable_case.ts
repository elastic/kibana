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
  collection: SavedObject<CaseAttributes>;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  caseService: CasesService;
  attachmentService: AttachmentService;
  logger: Logger;
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
}

// TODO: refactor, what is the purpose of this class now? It could be useful to interact with a case more easily?
// but it doesn't abstract multiple things now
/**
 * This class represents a case that can have a comment attached to it. This includes
 * a Sub Case, Case, and Collection.
 */
export class CommentableCase {
  private readonly collection: SavedObject<CaseAttributes>;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private readonly caseService: CasesService;
  private readonly attachmentService: AttachmentService;
  private readonly logger: Logger;
  private readonly lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];

  constructor({
    collection,
    unsecuredSavedObjectsClient,
    caseService,
    attachmentService,
    logger,
    lensEmbeddableFactory,
  }: CommentableCaseParams) {
    this.collection = collection;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.caseService = caseService;
    this.attachmentService = attachmentService;
    this.logger = logger;
    this.lensEmbeddableFactory = lensEmbeddableFactory;
  }

  public get status(): CaseStatuses {
    return this.collection.attributes.status;
  }

  /**
   * This property is used to abstract away which element is actually being acted upon in this class.
   * If the sub case was initialized then it will be the focus of creating comments. So if you want the id
   * of the saved object that the comment is primarily being attached to use this property.
   *
   * This is a little confusing because the created comment will have references to both the sub case and the
   * collection but from the UI's perspective only the sub case really has the comment attached to it.
   */
  public get id(): string {
    return this.collection.id;
  }

  public get settings(): CaseSettings {
    return this.collection.attributes.settings;
  }

  /**
   * These functions break the abstraction of this class but they are needed to build the comment user action item.
   * Another potential solution would be to implement another function that handles creating the user action in this
   * class so that we don't need to expose these properties.
   */
  public get caseId(): string {
    return this.collection.id;
  }

  private get owner(): string {
    return this.collection.attributes.owner;
  }

  private buildRefsToCase(): SavedObjectReference[] {
    return [
      {
        type: CASE_SAVED_OBJECT,
        name: `associated-${CASE_SAVED_OBJECT}`,
        id: this.collection.id,
      },
    ];
  }

  private async update({ date, user }: { date: string; user: User }): Promise<CommentableCase> {
    try {
      const updatedCase = await this.caseService.patchCase({
        originalCase: this.collection,
        unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
        caseId: this.collection.id,
        updatedAttributes: {
          updated_at: date,
          updated_by: { ...user },
        },
        version: this.collection.version,
      });

      // this will contain the updated sub case information if the sub case was defined initially
      return new CommentableCase({
        collection: {
          ...this.collection,
          attributes: {
            ...this.collection.attributes,
            ...updatedCase.attributes,
          },
          version: updatedCase.version ?? this.collection.version,
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

  private formatCollectionForEncoding(totalComment: number) {
    return {
      id: this.collection.id,
      version: this.collection.version ?? '0',
      totalComment,
      ...this.collection.attributes,
    };
  }

  public async encode(): Promise<CaseResponse> {
    try {
      const collectionComments = await this.caseService.getAllCaseComments({
        unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
        id: this.collection.id,
        options: {
          fields: [],
          page: 1,
          perPage: MAX_DOCS_PER_PAGE,
        },
      });

      const collectionTotalAlerts =
        countAlertsForID({ comments: collectionComments, id: this.collection.id }) ?? 0;

      const caseResponse = {
        comments: flattenCommentSavedObjects(collectionComments.saved_objects),
        totalAlerts: collectionTotalAlerts,
        ...this.formatCollectionForEncoding(collectionComments.total),
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
