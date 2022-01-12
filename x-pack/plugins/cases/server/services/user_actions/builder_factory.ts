/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../../../common/api';
import { CreateCaseUserActionBuilder } from './builders/create_case';
import { TitleUserActionBuilder } from './builders/title';
import { CommentUserActionBuilder } from './builders/comment';
import { ConnectorUserActionBuilder } from './builders/connector';
import { DescriptionUserActionBuilder } from './builders/description';
import { PushedUserActionBuilder } from './builders/pushed';
import { StatusUserActionBuilder } from './builders/status';
import { TagsUserActionBuilder } from './builders/tags';
import { SettingsUserActionBuilder } from './builders/settings';
import { DeleteCaseUserActionBuilder } from './builders/delete_case';
import { UserActionBuilder } from './abstract_builder';

const builderMap = {
  title: TitleUserActionBuilder,
  create_case: CreateCaseUserActionBuilder,
  connector: ConnectorUserActionBuilder,
  comment: CommentUserActionBuilder,
  description: DescriptionUserActionBuilder,
  pushed: PushedUserActionBuilder,
  tags: TagsUserActionBuilder,
  status: StatusUserActionBuilder,
  settings: SettingsUserActionBuilder,
  delete_case: DeleteCaseUserActionBuilder,
};

export class BuilderFactory {
  getBuilder<T extends UserActionTypes>(type: T): UserActionBuilder | undefined {
    return new builderMap[type]();
  }
}
