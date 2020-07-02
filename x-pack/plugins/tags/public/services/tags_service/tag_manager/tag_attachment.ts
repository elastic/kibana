/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { RawTagAttachmentWithId } from '../../../../common';

export class TagAttachment {
  public readonly data$: BehaviorSubject<RawTagAttachmentWithId>;

  public get data(): RawTagAttachmentWithId {
    return this.data$.getValue();
  }

  public get id(): string {
    return this.data.id;
  }

  constructor(data: RawTagAttachmentWithId) {
    this.data$ = new BehaviorSubject<RawTagAttachmentWithId>(data);
  }
}
