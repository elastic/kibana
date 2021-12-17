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

export class BuilderFactory {
  getBuilder(type: UserActionTypes) {
    switch (type) {
      case 'title':
        return new TitleUserActionBuilder();
      case 'create_case':
        return new CreateCaseUserActionBuilder();
      case 'connector':
        return new ConnectorUserActionBuilder();
      case 'comment':
        return new CommentUserActionBuilder();
      case 'description':
        return new DescriptionUserActionBuilder();
      case 'pushed':
        return new PushedUserActionBuilder();
      case 'tags':
        return new TagsUserActionBuilder();
      case 'status':
        return new StatusUserActionBuilder();
      case 'settings':
        return new SettingsUserActionBuilder();
      case 'delete_case':
        return new DeleteCaseUserActionBuilder();
      default:
        return null;
    }
  }
}
