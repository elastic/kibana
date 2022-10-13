/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { BehaviorSubject } from 'rxjs';

export class SimpleStateSubject<S extends object = {}> extends BehaviorSubject<S> {
  constructor(initialState: S) {
    super(initialState);
  }

  public getSnapshot() {
    return this.getValue();
  }

  public setState(nextState: Partial<S>): void {
    this.next(merge({}, this.getSnapshot(), nextState));
  }
}

export const createStateSubject = <S extends object = {}>(initialState: S) =>
  new SimpleStateSubject(initialState);
