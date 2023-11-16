/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseActionV2RequestBody } from '../../../../common/api/endpoint';
import type { ActionDetails } from '../../../../common/endpoint/types';

export interface ResponseActionsProvider<TActionDetails extends ActionDetails = ActionDetails> {
  /** Isolates the host */
  isolate: (options: BaseActionV2RequestBody) => Promise<TActionDetails>;

  /** Un-Isolates the host */
  release: (options: BaseActionV2RequestBody) => Promise<TActionDetails>;
}
