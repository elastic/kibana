/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Embeddable, EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { EnhancedEmbeddable } from '@kbn/embeddable-enhanced-plugin/public';
import {
  UiActionsEnhancedMemoryActionStorage as MemoryActionStorage,
  UiActionsEnhancedDynamicActionManager as DynamicActionManager,
  AdvancedUiActionsStart,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { uiActionsEnhancedPluginMock } from '@kbn/ui-actions-enhanced-plugin/public/mocks';

export class MockEmbeddable extends Embeddable {
  public rootType = 'dashboard';
  public readonly type = 'mock';
  private readonly triggers: string[] = [];
  constructor(initialInput: EmbeddableInput, params: { supportedTriggers?: string[] }) {
    super(initialInput, {}, undefined);
    this.triggers = params.supportedTriggers ?? [];
  }
  public render(node: HTMLElement) {}
  public reload() {}
  public supportedTriggers(): string[] {
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
