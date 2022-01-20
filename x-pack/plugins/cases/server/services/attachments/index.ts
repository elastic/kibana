/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsUpdateOptions,
} from 'kibana/server';

import type { KueryNode } from '@kbn/es-query';
import {
  AttributesTypeAlerts,
  CommentAttributes as AttachmentAttributes,
  CommentPatchAttributes as AttachmentPatchAttributes,
  CommentType,
} from '../../../common/api';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
} from '../../../common/constants';
import { ClientArgs } from '..';
import { buildFilter, combineFilters } from '../../client/utils';

interface GetAllAlertsAttachToCaseArgs extends ClientArgs {
  caseId: string;
  filter?: KueryNode;
}

interface GetAttachmentArgs extends ClientArgs {
  attachmentId: string;
}

interface CreateAttachmentArgs extends ClientArgs {
  attributes: AttachmentAttributes;
  references: SavedObjectReference[];
  id: string;
}

interface UpdateArgs {
  attachmentId: string;
  updatedAttributes: AttachmentPatchAttributes;
  options?: SavedObjectsUpdateOptions<AttachmentAttributes>;
}

export type UpdateAttachmentArgs = UpdateArgs & ClientArgs;

interface BulkUpdateAttachmentArgs extends ClientArgs {
  comments: UpdateArgs[];
}

export class AttachmentService {
  constructor(private readonly log: Logger) {}

  /**
   * Retrieves all the alerts attached to a case.
   */
  public async getAllAlertsAttachToCase({
    unsecuredSavedObjectsClient,
    caseId,
    filter,
  }: GetAllAlertsAttachToCaseArgs): Promise<Array<SavedObject<AttributesTypeAlerts>>> {
    try {
      this.log.debug(`Attempting to GET all alerts for case id ${caseId}`);
      const alertsFilter = buildFilter({
        filters: [CommentType.alert, CommentType.generatedAlert],
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      });

      const combinedFilter = combineFilters([alertsFilter, filter]);

      const finder = unsecuredSavedObjectsClient.createPointInTimeFinder<AttributesTypeAlerts>({
        type: CASE_COMMENT_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        sortField: 'created_at',
        sortOrder: 'asc',
        filter: combinedFilter,
        perPage: MAX_DOCS_PER_PAGE,
      });

      let result: Array<SavedObject<AttributesTypeAlerts>> = [];
      for await (const userActionSavedObject of finder.find()) {
        result = result.concat(userActionSavedObject.saved_objects);
      }

      return result;
    } catch (error) {
      this.log.error(`Error on GET all alerts for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  public async get({
    unsecuredSavedObjectsClient,
    attachmentId,
  }: GetAttachmentArgs): Promise<SavedObject<AttachmentAttributes>> {
    try {
      this.log.debug(`Attempting to GET attachment ${attachmentId}`);
      return await unsecuredSavedObjectsClient.get<AttachmentAttributes>(
        CASE_COMMENT_SAVED_OBJECT,
        attachmentId
      );
    } catch (error) {
      this.log.error(`Error on GET attachment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async delete({ unsecuredSavedObjectsClient, attachmentId }: GetAttachmentArgs) {
    try {
      this.log.debug(`Attempting to DELETE attachment ${attachmentId}`);
      return await unsecuredSavedObjectsClient.delete(CASE_COMMENT_SAVED_OBJECT, attachmentId);
    } catch (error) {
      this.log.error(`Error on DELETE attachment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async create({
    unsecuredSavedObjectsClient,
    attributes,
    references,
    id,
  }: CreateAttachmentArgs) {
    try {
      this.log.debug(`Attempting to POST a new comment`);
      return await unsecuredSavedObjectsClient.create<AttachmentAttributes>(
        CASE_COMMENT_SAVED_OBJECT,
        attributes,
        {
          references,
          id,
        }
      );
    } catch (error) {
      this.log.error(`Error on POST a new comment: ${error}`);
      throw error;
    }
  }

  public async update({
    unsecuredSavedObjectsClient,
    attachmentId,
    updatedAttributes,
    options,
  }: UpdateAttachmentArgs) {
    try {
      this.log.debug(`Attempting to UPDATE comment ${attachmentId}`);
      return await unsecuredSavedObjectsClient.update<AttachmentAttributes>(
        CASE_COMMENT_SAVED_OBJECT,
        attachmentId,
        updatedAttributes,
        options
      );
    } catch (error) {
      this.log.error(`Error on UPDATE comment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async bulkUpdate({ unsecuredSavedObjectsClient, comments }: BulkUpdateAttachmentArgs) {
    try {
      this.log.debug(
        `Attempting to UPDATE comments ${comments.map((c) => c.attachmentId).join(', ')}`
      );
      return await unsecuredSavedObjectsClient.bulkUpdate<AttachmentAttributes>(
        comments.map((c) => ({
          type: CASE_COMMENT_SAVED_OBJECT,
          id: c.attachmentId,
          attributes: c.updatedAttributes,
          ...c.options,
        }))
      );
    } catch (error) {
      this.log.error(
        `Error on UPDATE comments ${comments.map((c) => c.attachmentId).join(', ')}: ${error}`
      );
      throw error;
    }
  }
}
