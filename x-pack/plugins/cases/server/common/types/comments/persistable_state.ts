/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '../json';
import type { CommentType } from './common';

export interface PersistableStateAttachment {
  type: typeof CommentType.persistableState;
  owner: string;
  persistableStateAttachmentState: JsonObject;
}
