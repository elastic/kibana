/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { SecuritySubPluginWithStore } from '../app/types';
import { routes } from './routes';
import { initialUsersState, usersReducer, usersModel } from './store';

export class Users {
  public setup() {}

  public start(storage: Storage): SecuritySubPluginWithStore<'users', usersModel.UsersModel> {
    return {
      routes,
      store: {
        initialState: { users: initialUsersState },
        reducer: { users: usersReducer },
      },
    };
  }
}
