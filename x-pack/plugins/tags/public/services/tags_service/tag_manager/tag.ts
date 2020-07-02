/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { RawTagWithId } from '../../../../common';

export class Tag {
  public readonly data$: BehaviorSubject<RawTagWithId>;

  public get data(): RawTagWithId {
    return this.data$.getValue();
  }

  public get id(): string {
    return this.data.id;
  }

  constructor(data: RawTagWithId) {
    this.data$ = new BehaviorSubject<RawTagWithId>(data);
  }
}
