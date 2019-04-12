/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


import {
  embeddableFactories,
  EmbeddableFactory,
  EmbeddableInput,
  EmbeddableOutput,
} from 'plugins/embeddable_api/index';
import { UsersEmbeddable } from './users_embeddable';

export const USERS_EMBEDDABLE = 'USERS_EMBEDDABLE';

export interface User {
  name: string;
  email: string;
  username: string;
}

export interface UsersEmbeddableOutput extends EmbeddableOutput {
  users: User[];
}

export class UsersEmbeddableFactory extends EmbeddableFactory<
  EmbeddableInput,
  UsersEmbeddableOutput
> {
  constructor() {
    super({
      name: USERS_EMBEDDABLE,
    });
  }

  public getOutputSpec() {
    return {};
  }

  public create(initialInput: EmbeddableInput) {
    return Promise.resolve(new UsersEmbeddable(initialInput));
  }
}

embeddableFactories.registerFactory(new UsersEmbeddableFactory());
