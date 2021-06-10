/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObject, SavedObjectReference } from 'kibana/server';

import {
  CommentAttributes as AttachmentAttributes,
  CommentPatchAttributes as AttachmentPatchAttributes,
} from '../../../common/api';
import { CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import { ClientArgs } from '..';

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
  version?: string;
}

type UpdateAttachmentArgs = UpdateArgs & ClientArgs;

interface BulkUpdateAttachmentArgs extends ClientArgs {
  comments: UpdateArgs[];
}

export class AttachmentService {
  constructor(private readonly log: Logger) {}

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
    version,
  }: UpdateAttachmentArgs) {
    try {
      this.log.debug(`Attempting to UPDATE comment ${attachmentId}`);
      return await unsecuredSavedObjectsClient.update<AttachmentAttributes>(
        CASE_COMMENT_SAVED_OBJECT,
        attachmentId,
        updatedAttributes,
        { version }
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
          version: c.version,
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
