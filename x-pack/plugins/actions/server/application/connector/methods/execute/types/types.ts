/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionExecutionSource, RelatedSavedObjects } from '../../../../../lib';
import { ActionsClientContext } from '../../../../../actions_client';

export interface ConnectorExecuteParams<Source = unknown> {
  context: ActionsClientContext;
  actionId: string;
  params: Record<string, unknown>;
  source?: ActionExecutionSource<Source>;
  relatedSavedObjects?: RelatedSavedObjects;
}
