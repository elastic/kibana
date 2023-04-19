/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssigneesUserAction } from './assignees';
import type { CommentUserAction } from './comment';
import type { UserActionCommonPersistedAttributes } from './common';
import type { ConnectorUserAction } from './connector';
import type { CreateCaseUserAction } from './create_case';
import type { DeleteCaseUserAction } from './delete_case';
import type { DescriptionUserAction } from './description';
import type { PushedUserAction } from './pushed';
import type { SettingsUserAction } from './settings';
import type { SeverityUserAction } from './severity';
import type { StatusUserAction } from './status';
import type { TagsUserAction } from './tags';
import type { TitleUserAction } from './title';

type CommonUserActions =
  | DescriptionUserAction
  | CommentUserAction
  | TagsUserAction
  | TitleUserAction
  | SettingsUserAction
  | StatusUserAction
  | SeverityUserAction
  | AssigneesUserAction;

export type UserActionPersistedAttributes = (
  | CommonUserActions
  | CreateCaseUserAction
  | ConnectorUserAction
  | PushedUserAction
  | DeleteCaseUserAction
) &
  UserActionCommonPersistedAttributes;
