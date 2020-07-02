/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */

import { BehaviorSubject } from 'rxjs';
import { TagAttachment } from './tag_attachment';

export class Resource {
  public readonly attachments$: BehaviorSubject<TagAttachment[]>;

  constructor(public readonly kid: string, attachments: TagAttachment[] = []) {
    this.attachments$ = new BehaviorSubject<TagAttachment[]>(attachments);
  }

  public set(attachments: TagAttachment[]) {
    this.attachments$.next(attachments);
  }
}

export type ResourceMap = Record<string, Resource>;

export class Resources {
  public readonly data$ = new BehaviorSubject<ResourceMap>({});

  public get data() {
    return this.data$.getValue();
  }

  public get(kid: string): Resource | undefined {
    const { data } = this;
    if (!data.hasOwnProperty(kid)) return undefined;
    return data[kid];
  }

  public set(kid: string, attachments: TagAttachment[]) {
    const resource = this.get(kid);
    if (resource) {
      resource.set(attachments);
      return;
    }
    this.add(new Resource(kid, attachments));
  }

  public add(resource: Resource) {
    const { data } = this;
    this.data$.next({ ...data, [resource.kid]: resource });
  }
}
