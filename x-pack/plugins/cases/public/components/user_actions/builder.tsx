/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCommentUserActionBuilder } from './comment/comment';
import { createConnectorUserActionBuilder } from './connector';
import { createDescriptionUserActionBuilder } from './description';
import { createPushedUserActionBuilder } from './pushed';
import { createSettingsUserActionBuilder } from './settings';
import { createStatusUserActionBuilder } from './status';
import { createTagsUserActionBuilder } from './tags';
import { createTitleUserActionBuilder } from './title';
import { UserActionBuilderMap } from './types';

export const builderMap: UserActionBuilderMap = {
  connector: createConnectorUserActionBuilder,
  tags: createTagsUserActionBuilder,
  title: createTitleUserActionBuilder,
  status: createStatusUserActionBuilder,
  pushed: createPushedUserActionBuilder,
  comment: createCommentUserActionBuilder,
  description: createDescriptionUserActionBuilder,
  settings: createSettingsUserActionBuilder,
};
