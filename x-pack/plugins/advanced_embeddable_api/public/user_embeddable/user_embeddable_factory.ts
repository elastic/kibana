/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  embeddableFactories,
  EmbeddableFactory,
  EmbeddableInput,
  EmbeddableOutput,
} from 'plugins/embeddable_api';
import chrome from 'ui/chrome';
import { getNewPlatform } from 'ui/new_platform';
import { FlyoutRef } from '../../../../../src/core/public';
import { User } from '../users_embeddable/users_embeddable_factory';
import { UserEmbeddable } from './user_embeddable';

export const USER_EMBEDDABLE = 'USER_EMBEDDABLE';

export interface UserEmbeddableInput extends EmbeddableInput {
  username: string;
}

export interface UserEmbeddableOutput extends EmbeddableOutput {
  user?: User;
  error?: string;
}

export class UserEmbeddableFactory extends EmbeddableFactory<
  UserEmbeddableInput,
  UserEmbeddableOutput,
  { username: string; email: string; full_name: string }
> {
  constructor() {
    super({
      name: USER_EMBEDDABLE,
    });
  }

  public getOutputSpec() {
    return {};
  }

  public async create(initialInput: UserEmbeddableInput) {
    return Promise.resolve(new UserEmbeddable(initialInput));
  }
}

embeddableFactories.registerFactory(new UserEmbeddableFactory());
