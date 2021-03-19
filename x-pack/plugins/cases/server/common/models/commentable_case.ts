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
  SavedObjectsUpdateResponse,
  Logger,
} from 'src/core/server';
import {
  AssociationType,
  CaseSettings,
  CaseStatuses,
  CaseType,
  CaseResponse,
  CaseResponseRt,
  CommentAttributes,
  CommentPatchRequest,
  CommentRequest,
  CommentType,
  ESCaseAttributes,
  SubCaseAttributes,
  User,
} from '../../../common/api';
import { transformESConnectorToCaseConnector } from '../../routes/api/cases/helpers';
import {
  flattenCommentSavedObjects,
  flattenSubCaseSavedObject,
  transformNewComment,
} from '../../routes/api/utils';
import { CASE_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../saved_object_types';
import { CaseServiceSetup } from '../../services';
import { createCaseError } from '../error';
import { countAlertsForID } from '../index';

interface UpdateCommentResp {
  comment: SavedObjectsUpdateResponse<CommentAttributes>;
  commentableCase: CommentableCase;
}

interface NewCommentResp {
  comment: SavedObject<CommentAttributes>;
  commentableCase: CommentableCase;
}

interface CommentableCaseParams {
  collection: SavedObject<ESCaseAttributes>;
  subCase?: SavedObject<SubCaseAttributes>;
  soClient: SavedObjectsClientContract;
  service: CaseServiceSetup;
  logger: Logger;
}

/**
 * This class represents a case that can have a comment attached to it. This includes
 * a Sub Case, Case, and Collection.
 */
export class CommentableCase {
  private readonly collection: SavedObject<ESCaseAttributes>;
  private readonly subCase?: SavedObject<SubCaseAttributes>;
  private readonly soClient: SavedObjectsClientContract;
  private readonly service: CaseServiceSetup;
  private readonly logger: Logger;

  constructor({ collection, subCase, soClient, service, logger }: CommentableCaseParams) {
    this.collection = collection;
    this.subCase = subCase;
    this.soClient = soClient;
    this.service = service;
    this.logger = logger;
  }

  public get status(): CaseStatuses {
    return this.subCase?.attributes.status ?? this.collection.attributes.status;
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
    return this.subCase?.id ?? this.collection.id;
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

  public get subCaseId(): string | undefined {
    return this.subCase?.id;
  }

  private buildRefsToCase(): SavedObjectReference[] {
    const subCaseSOType = SUB_CASE_SAVED_OBJECT;
    const caseSOType = CASE_SAVED_OBJECT;
    return [
      {
        type: caseSOType,
        name: `associated-${caseSOType}`,
        id: this.collection.id,
      },
      ...(this.subCase
        ? [{ type: subCaseSOType, name: `associated-${subCaseSOType}`, id: this.subCase.id }]
        : []),
    ];
  }

  private async update({ date, user }: { date: string; user: User }): Promise<CommentableCase> {
    try {
      let updatedSubCaseAttributes: SavedObject<SubCaseAttributes> | undefined;

      if (this.subCase) {
        const updatedSubCase = await this.service.patchSubCase({
          client: this.soClient,
          subCaseId: this.subCase.id,
          updatedAttributes: {
            updated_at: date,
            updated_by: {
              ...user,
            },
          },
          // version: this.subCase.version,
        });

        updatedSubCaseAttributes = {
          ...this.subCase,
          attributes: {
            ...this.subCase.attributes,
            ...updatedSubCase.attributes,
          },
          version: updatedSubCase.version ?? this.subCase.version,
        };
      }

      const updatedCase = await this.service.patchCase({
        client: this.soClient,
        caseId: this.collection.id,
        updatedAttributes: {
          updated_at: date,
          updated_by: { ...user },
        },
        // version: this.collection.version,
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
        subCase: updatedSubCaseAttributes,
        soClient: this.soClient,
        service: this.service,
        logger: this.logger,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to update commentable case, sub case id: ${this.subCaseId} case id: ${this.caseId}: ${error}`,
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

      const [comment, commentableCase] = await Promise.all([
        this.service.patchComment({
          client: this.soClient,
          commentId: id,
          updatedAttributes: {
            ...queryRestAttributes,
            updated_at: updatedAt,
            updated_by: user,
          },
          version,
        }),
        this.update({ date: updatedAt, user }),
      ]);
      return {
        comment,
        commentableCase,
      };
    } catch (error) {
      throw createCaseError({
        message: `Failed to update comment in commentable case, sub case id: ${this.subCaseId} case id: ${this.caseId}: ${error}`,
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
  }: {
    createdDate: string;
    user: User;
    commentReq: CommentRequest;
  }): Promise<NewCommentResp> {
    try {
      if (commentReq.type === CommentType.alert) {
        if (this.status === CaseStatuses.closed) {
          throw Boom.badRequest('Alert cannot be attached to a closed case');
        }

        if (!this.subCase && this.collection.attributes.type === CaseType.collection) {
          throw Boom.badRequest('Alert cannot be attached to a collection case');
        }
      }

      const [comment, commentableCase] = await Promise.all([
        this.service.postNewComment({
          client: this.soClient,
          attributes: transformNewComment({
            associationType: this.subCase ? AssociationType.subCase : AssociationType.case,
            createdDate,
            ...commentReq,
            ...user,
          }),
          references: this.buildRefsToCase(),
        }),
        this.update({ date: createdDate, user }),
      ]);
      return {
        comment,
        commentableCase,
      };
    } catch (error) {
      throw createCaseError({
        message: `Failed creating a comment on a commentable case, sub case id: ${this.subCaseId} case id: ${this.caseId}: ${error}`,
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
      connector: transformESConnectorToCaseConnector(this.collection.attributes.connector),
    };
  }

  public async encode(): Promise<CaseResponse> {
    try {
      const collectionCommentStats = await this.service.getAllCaseComments({
        client: this.soClient,
        id: this.collection.id,
        options: {
          fields: [],
          page: 1,
          perPage: 1,
        },
      });

      const collectionComments = await this.service.getAllCaseComments({
        client: this.soClient,
        id: this.collection.id,
        options: {
          fields: [],
          page: 1,
          perPage: collectionCommentStats.total,
        },
      });

      const collectionTotalAlerts =
        countAlertsForID({ comments: collectionComments, id: this.collection.id }) ?? 0;

      const caseResponse = {
        comments: flattenCommentSavedObjects(collectionComments.saved_objects),
        totalAlerts: collectionTotalAlerts,
        ...this.formatCollectionForEncoding(collectionCommentStats.total),
      };

      if (this.subCase) {
        const subCaseComments = await this.service.getAllSubCaseComments({
          client: this.soClient,
          id: this.subCase.id,
        });
        const totalAlerts =
          countAlertsForID({ comments: subCaseComments, id: this.subCase.id }) ?? 0;

        return CaseResponseRt.encode({
          ...caseResponse,
          /**
           * For now we need the sub case comments and totals to be exposed on the top level of the response so that the UI
           * functionality can stay the same. Ideally in the future we can refactor this so that the UI will look for the
           * comments either in the top level for a case or a collection or in the subCases field if it is a sub case.
           *
           * If we ever need to return both the collection's comments and the sub case comments we'll need to refactor it then
           * as well.
           */
          comments: flattenCommentSavedObjects(subCaseComments.saved_objects),
          totalComment: subCaseComments.saved_objects.length,
          totalAlerts,
          subCases: [
            flattenSubCaseSavedObject({
              savedObject: this.subCase,
              totalComment: subCaseComments.saved_objects.length,
              totalAlerts,
            }),
          ],
        });
      }

      return CaseResponseRt.encode(caseResponse);
    } catch (error) {
      throw createCaseError({
        message: `Failed encoding the commentable case, sub case id: ${this.subCaseId} case id: ${this.caseId}: ${error}`,
        error,
        logger: this.logger,
      });
    }
  }
}
