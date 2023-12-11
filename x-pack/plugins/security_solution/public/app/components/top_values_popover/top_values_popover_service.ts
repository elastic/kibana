/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

interface TopValuesData {
  fieldName: string;
  scopeId?: string;
  nodeRef: HTMLElement;
}

export class TopValuesPopoverService {
  private currentPopoverSubject$: BehaviorSubject<TopValuesData | undefined>;

  constructor() {
    this.currentPopoverSubject$ = new BehaviorSubject<TopValuesData | undefined>(undefined);
  }

  showPopover(data: TopValuesData) {
    return this.currentPopoverSubject$.next(data);
  }

  closePopover() {
    return this.currentPopoverSubject$.next(undefined);
  }

  getObservable() {
    return this.currentPopoverSubject$.asObservable();
  }
}
