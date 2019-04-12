/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { string } from 'joi';
import { Embeddable, EmbeddableInput, triggerRegistry } from 'plugins/embeddable_api/index';
import React from 'react';
import ReactDom from 'react-dom';
import { kfetch } from 'ui/kfetch';
import { USERS_EMBEDDABLE, UsersEmbeddableOutput } from './users_embeddable_factory';
import { UsersTable } from './users_table';

export const VIEW_EMPLOYEE_TRIGGER = 'VIEW_EMPLOYEE_TRIGGER';
export const EMAIL_EMPLOYEE_TRIGGER = 'EMAIL_EMPLOYEE_TRIGGER';

export class UsersEmbeddable extends Embeddable<EmbeddableInput, UsersEmbeddableOutput> {
  constructor(initialInput: EmbeddableInput) {
    super(USERS_EMBEDDABLE, initialInput, { users: [] });
    this.initializeOutput();
  }

  public render(node: HTMLElement) {
    ReactDom.render(<UsersTable key={this.id} embeddable={this} />, node);
  }

  private async initializeOutput() {
    const usersUrl = '/api/security/v1/users';
    const data = await kfetch({ pathname: usersUrl });
    this.updateOutput({
      users: data.map((row: { username: string; full_name: string; email: string }) => ({
        username: row.username,
        name: row.full_name,
        email: row.email,
      })),
    });
  }
}

// triggerRegistry.registerTrigger({
//   id: VIEW_EMPLOYEE_TRIGGER,
//   title: 'View employee',
// });

// triggerRegistry.registerTrigger({
//   id: EMAIL_EMPLOYEE_TRIGGER,
//   title: 'Email employee',
// });

// triggerRegistry.addDefaultAction({ triggerId: VIEW_EMPLOYEE_TRIGGER, actionId:  })
