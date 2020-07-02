/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { TagAttachment } from './tag_attachment';
import { RawTagAttachmentWithId } from '../../../../common';

export type TagAttachmentMap = Record<string, TagAttachment>;

export class TagAttachments {
  public readonly data$ = new BehaviorSubject<TagAttachmentMap>({});

  public get data() {
    return this.data$.getValue();
  }

  public add(attachments: RawTagAttachmentWithId[]): TagAttachmentMap {
    const newData: TagAttachmentMap = {};
    for (const rawAttachment of attachments) {
      const attachment = new TagAttachment(rawAttachment);
      newData[attachment.id] = attachment;
    }
    const data: TagAttachmentMap = { ...this.data$.getValue(), ...newData };
    this.data$.next(data);
    return data;
  }

  public get = (id: string): TagAttachment | undefined => {
    const { data } = this;
    if (!data.hasOwnProperty(id)) return undefined;
    return data[id];
  };

  public getMany(ids: string[]): TagAttachment[] {
    return ids.map(this.get).filter(Boolean) as TagAttachment[];
  }
}
