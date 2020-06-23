/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Embeddable, EmbeddableInput } from '../../../../../../../src/plugins/embeddable/public';
import { EnhancedEmbeddable } from '../../../../../embeddable_enhanced/public';
import {
  UiActionsEnhancedMemoryActionStorage as MemoryActionStorage,
  UiActionsEnhancedDynamicActionManager as DynamicActionManager,
  AdvancedUiActionsStart,
} from '../../../../../ui_actions_enhanced/public';
import { TriggerContextMapping } from '../../../../../../../src/plugins/ui_actions/public';
import { uiActionsEnhancedPluginMock } from '../../../../../ui_actions_enhanced/public/mocks';

export class MockEmbeddable extends Embeddable {
  public rootType = 'dashboard';
  public readonly type = 'mock';
  private readonly triggers: Array<keyof TriggerContextMapping> = [];
  constructor(
    initialInput: EmbeddableInput,
    params: { supportedTriggers?: Array<keyof TriggerContextMapping> }
  ) {
    super(initialInput, {}, undefined);
    this.triggers = params.supportedTriggers ?? [];
  }
  public render(node: HTMLElement) {}
  public reload() {}
  public supportedTriggers(): Array<keyof TriggerContextMapping> {
    return this.triggers;
  }
  public getRoot() {
    return {
      type: this.rootType,
    } as Embeddable;
  }
}

export const enhanceEmbeddable = <E extends MockEmbeddable>(
  embeddable: E,
  uiActions: AdvancedUiActionsStart = uiActionsEnhancedPluginMock.createStartContract()
): EnhancedEmbeddable<E> => {
  (embeddable as EnhancedEmbeddable<E>).enhancements = {
    dynamicActions: new DynamicActionManager({
      storage: new MemoryActionStorage(),
      isCompatible: async () => true,
      uiActions,
    }),
  };
  return embeddable as EnhancedEmbeddable<E>;
};
