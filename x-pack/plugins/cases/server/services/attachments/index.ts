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
    client,
    attachmentId,
  }: GetAttachmentArgs): Promise<SavedObject<AttachmentAttributes>> {
    try {
      this.log.debug(`Attempting to GET attachment ${attachmentId}`);
      return await client.get<AttachmentAttributes>(CASE_COMMENT_SAVED_OBJECT, attachmentId);
    } catch (error) {
      this.log.error(`Error on GET attachment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async delete({ client, attachmentId }: GetAttachmentArgs) {
    try {
      this.log.debug(`Attempting to GET attachment ${attachmentId}`);
      return await client.delete(CASE_COMMENT_SAVED_OBJECT, attachmentId);
    } catch (error) {
      this.log.error(`Error on GET attachment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async create({ client, attributes, references }: CreateAttachmentArgs) {
    try {
      this.log.debug(`Attempting to POST a new comment`);
      return await client.create<AttachmentAttributes>(CASE_COMMENT_SAVED_OBJECT, attributes, {
        references,
      });
    } catch (error) {
      this.log.error(`Error on POST a new comment: ${error}`);
      throw error;
    }
  }

  public async update({ client, attachmentId, updatedAttributes, version }: UpdateAttachmentArgs) {
    try {
      this.log.debug(`Attempting to UPDATE comment ${attachmentId}`);
      return await client.update<AttachmentAttributes>(
        CASE_COMMENT_SAVED_OBJECT,
        attachmentId,
        {
          ...updatedAttributes,
        },
        { version }
      );
    } catch (error) {
      this.log.error(`Error on UPDATE comment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async bulkUpdate({ client, comments }: BulkUpdateAttachmentArgs) {
    try {
      this.log.debug(
        `Attempting to UPDATE comments ${comments.map((c) => c.attachmentId).join(', ')}`
      );
      return await client.bulkUpdate<AttachmentAttributes>(
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
