/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserActionTypes } from '../../../common/api';
import { CreateCaseUserActionBuilder } from './builders/create_case';
import { TitleUserActionBuilder } from './builders/title';
import { CommentUserActionBuilder } from './builders/comment';
import { ConnectorUserActionBuilder } from './builders/connector';
import { DescriptionUserActionBuilder } from './builders/description';
import { PushedUserActionBuilder } from './builders/pushed';
import { StatusUserActionBuilder } from './builders/status';
import { TagsUserActionBuilder } from './builders/tags';
import { SettingsUserActionBuilder } from './builders/settings';
import type { UserActionBuilder } from './abstract_builder';
import { SeverityUserActionBuilder } from './builders/severity';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type { BuilderDeps } from './types';
import { AssigneesUserActionBuilder } from './builders/assignees';
import { NoopUserActionBuilder } from './builders/noop';

const builderMap = {
  assignees: AssigneesUserActionBuilder,
  title: TitleUserActionBuilder,
  create_case: CreateCaseUserActionBuilder,
  connector: ConnectorUserActionBuilder,
  comment: CommentUserActionBuilder,
  description: DescriptionUserActionBuilder,
  pushed: PushedUserActionBuilder,
  tags: TagsUserActionBuilder,
  status: StatusUserActionBuilder,
  severity: SeverityUserActionBuilder,
  settings: SettingsUserActionBuilder,
  delete_case: NoopUserActionBuilder,
};

export class BuilderFactory {
  private readonly persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;

  constructor(deps: BuilderDeps) {
    this.persistableStateAttachmentTypeRegistry = deps.persistableStateAttachmentTypeRegistry;
  }

  getBuilder<T extends UserActionTypes>(type: T): UserActionBuilder | undefined {
    return new builderMap[type]({
      persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
    });
  }
}
