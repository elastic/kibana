/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserActionType } from '../../../common/types/domain';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type { UserActionBuilder } from './abstract_builder';
import { AssigneesUserActionBuilder } from './builders/assignees';
import { CategoryUserActionBuilder } from './builders/category';
import { CommentUserActionBuilder } from './builders/comment';
import { ConnectorUserActionBuilder } from './builders/connector';
import { CreateCaseUserActionBuilder } from './builders/create_case';
import { CustomFieldsUserActionBuilder } from './builders/custom_fields';
import { DescriptionUserActionBuilder } from './builders/description';
import { NoopUserActionBuilder } from './builders/noop';
import { PushedUserActionBuilder } from './builders/pushed';
import { SettingsUserActionBuilder } from './builders/settings';
import { SeverityUserActionBuilder } from './builders/severity';
import { StatusUserActionBuilder } from './builders/status';
import { TagsUserActionBuilder } from './builders/tags';
import { TitleUserActionBuilder } from './builders/title';
import type { BuilderDeps } from './types';

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
  category: CategoryUserActionBuilder,
  severity: SeverityUserActionBuilder,
  settings: SettingsUserActionBuilder,
  delete_case: NoopUserActionBuilder,
  customFields: CustomFieldsUserActionBuilder,
};

export class BuilderFactory {
  private readonly persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;

  constructor(deps: BuilderDeps) {
    this.persistableStateAttachmentTypeRegistry = deps.persistableStateAttachmentTypeRegistry;
  }

  getBuilder<T extends UserActionType>(type: T): UserActionBuilder | undefined {
    return new builderMap[type]({
      persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
    });
  }
}
