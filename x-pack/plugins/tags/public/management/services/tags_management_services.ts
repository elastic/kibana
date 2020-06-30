/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedHistory, ChromeBreadcrumb, CoreSetup } from 'kibana/public';
import { TagsClient } from '../../services';

export interface Params {
  history: ScopedHistory;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  tagsClient: TagsClient;
  toasts: CoreSetup['notifications']['toasts'];
}

export class TagsManagementServices {
  constructor(public readonly params: Params) {}
}
