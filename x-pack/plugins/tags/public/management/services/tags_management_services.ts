/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedHistory, ChromeBreadcrumb, CoreSetup } from 'kibana/public';
import { TagsServiceContract, TagManager } from '../../services';

export interface Params {
  history: ScopedHistory;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  tags: TagsServiceContract;
  toasts: CoreSetup['notifications']['toasts'];
}

export class TagsManagementServices {
  public readonly manager: TagManager;

  constructor(public readonly params: Params) {
    this.manager = params.tags.manager;
  }
}
