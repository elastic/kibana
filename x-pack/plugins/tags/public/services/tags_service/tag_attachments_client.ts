/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TAGS_API_PATH,
  ITagAttachmentsClient,
  TagAttachmentClientCreateParams,
  TagAttachmentClientCreateResult,
  TagAttachmentClientGetResourceTagsParams,
  TagAttachmentClientGetResourceTagsResult,
  TagAttachmentClientDeleteParams,
  TagAttachmentClientFindResourcesParams,
  TagAttachmentClientFindResourcesResult,
} from '../../../common';
import { HttpSetup, HttpStart } from '../../../../../../src/core/public';

export interface TagAttachmentsClientParams {
  http: HttpSetup | HttpStart;
}

export class TagAttachmentsClient implements ITagAttachmentsClient {
  private readonly path = TAGS_API_PATH;

  constructor(private readonly params: TagAttachmentsClientParams) {}

  public async create(
    params: TagAttachmentClientCreateParams
  ): Promise<TagAttachmentClientCreateResult> {
    return await this.params.http.post<TagAttachmentClientCreateResult>(`${this.path}/attachment`, {
      body: JSON.stringify(params),
    });
  }

  public async del({ tagId, kid }: TagAttachmentClientDeleteParams): Promise<void> {
    return await this.params.http.delete(`${this.path}/tag/${tagId}/attachment/${btoa(kid)}`);
  }

  public async getAttachedTags({
    kid,
  }: TagAttachmentClientGetResourceTagsParams): Promise<TagAttachmentClientGetResourceTagsResult> {
    return await this.params.http.get<TagAttachmentClientGetResourceTagsResult>(
      `${this.path}/resource/${btoa(kid)}/tags`
    );
  }

  public async findResources(
    params: TagAttachmentClientFindResourcesParams
  ): Promise<TagAttachmentClientFindResourcesResult> {
    return await this.params.http.post<TagAttachmentClientFindResourcesResult>(
      `${this.path}/find_resources`,
      {
        body: JSON.stringify(params),
      }
    );
  }
}
