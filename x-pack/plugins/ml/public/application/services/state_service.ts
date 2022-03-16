/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';

export class StateService {
  protected unsubscribeAll$ = new Subject();

  public destroy() {
    this.unsubscribeAll$.next();
    this.unsubscribeAll$.complete();
  }
}
