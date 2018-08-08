/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

export class BaseAction {
  constructor(props = {}) {
    this.id = get(props, 'id');
    this.type = get(props, 'type');
  }

  get upstreamJson() {
    const result = {
      id: this.id,
      type: this.type
    };

    return result;
  }

  get typeName() {
    return this.constructor.typeName;
  }

  get iconClass() {
    return this.constructor.iconClass;
  }

  get selectMessage() {
    return this.constructor.selectMessage;
  }

  get simulateMessage() {
    return `Action ${this.id} simulated successfully`;
  }

  get simulatePrompt() {
    return this.constructor.simulatePrompt;
  }

  get template() {
    return this.constructor.template;
  }

  static typeName = 'Action';
  static iconClass = 'fa-cog';
  static template = '';
  static selectMessage = 'Perform an action.';
  static simulatePrompt = 'Simulate this action now';
}
