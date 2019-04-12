/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Embeddable, triggerRegistry } from 'plugins/embeddable_api/index';
import React from 'react';
import ReactDom from 'react-dom';
import { kfetch } from 'ui/kfetch';
import { UserCard } from './user_card';
import {
  USER_EMBEDDABLE,
  UserEmbeddableInput,
  UserEmbeddableOutput,
} from './user_embeddable_factory';

export const VIEW_USER_TRIGGER = 'VIEW_USER_TRIGGER';
export const EMAIL_USER_TRIGGER = 'EMAIL_USER_TRIGGER';

export class UserEmbeddable extends Embeddable<UserEmbeddableInput, UserEmbeddableOutput> {
  private unsubscribe: () => void;
  constructor(initialInput: UserEmbeddableInput) {
    super(USER_EMBEDDABLE, initialInput, {});
    this.unsubscribe = this.subscribeToInputChanges(() => this.initializeOutput());
    this.initializeOutput();
  }

  public destroy() {
    this.unsubscribe();
  }

  public render(node: HTMLElement) {
    ReactDom.render(<UserCard key={this.id} embeddable={this} />, node);
  }

  private async initializeOutput() {
    //  const usersUrl = chrome.addBasePath('/api/security/v1/users');
    try {
      const usersUrl = '/api/security/v1/users';
      const url = `${usersUrl}/${this.input.username}`;
      const { data } = await kfetch({ pathname: url });
      this.updateOutput({
        user: {
          ...data,
        },
      });
    } catch (e) {
      this.output.error = e;
    }
  }
}

triggerRegistry.registerTrigger({
  id: VIEW_USER_TRIGGER,
  title: 'View user',
  actionIds: [],
});

triggerRegistry.registerTrigger({
  id: EMAIL_USER_TRIGGER,
  title: 'Email user',
  actionIds: [],
});

// triggerRegistry.addDefaultAction({ triggerId: VIEW_EMPLOYEE_TRIGGER, actionId:  })
