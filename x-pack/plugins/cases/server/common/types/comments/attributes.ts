/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsComment } from './actions';
import type { AlertComment } from './alert';
import type { ExternalReference, ExternalReferenceSO } from './external_reference';
import type { PersistableStateAttachment } from './persistable_state';
import type { UserComment } from './user';

export type CommentRequest =
  | UserComment
  | AlertComment
  | ActionsComment
  | ExternalReferenceSO
  | ExternalReference
  | PersistableStateAttachment;
