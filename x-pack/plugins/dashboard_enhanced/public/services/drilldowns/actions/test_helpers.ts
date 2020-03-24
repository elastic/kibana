/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Embeddable, EmbeddableInput } from '../../../../../../../src/plugins/embeddable/public/';
import {
  TriggerContextMapping,
  UiActionsStart,
} from '../../../../../../../src/plugins/ui_actions/public';

export class MockEmbeddable extends Embeddable {
  public readonly type = 'mock';
  private readonly triggers: Array<keyof TriggerContextMapping> = [];
  constructor(
    initialInput: EmbeddableInput,
    params: { uiActions?: UiActionsStart; supportedTriggers?: Array<keyof TriggerContextMapping> }
  ) {
    super(initialInput, {}, undefined, params);
    this.triggers = params.supportedTriggers ?? [];
  }
  public render(node: HTMLElement) {}
  public reload() {}
  public supportedTriggers(): Array<keyof TriggerContextMapping> {
    return this.triggers;
  }
}
