/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TriggerContextMapping, TriggerId } from '../../../../../../src/plugins/ui_actions/public';

export interface UrlDrilldownTriggerDefinition<
  T extends TriggerId = TriggerId,
  EventScope extends object = {}
> {
  triggerId: T;
  isTriggerContext(context: object): boolean;
  getScopeForPreview(): EventScope;
  getScopeFromActionContext(context: TriggerContextMapping[T]): EventScope;
  scopeMeta?: Record<keyof EventScope, { description?: string; type?: string }>;
}

export class UrlDrilldownTriggerRegistry {
  private registry = new Map<TriggerId, UrlDrilldownTriggerDefinition>();
  registerTriggerDefinition(def: UrlDrilldownTriggerDefinition) {
    this.registry.set(def.triggerId, def);
  }

  getEventScopeForPreview(triggerId: TriggerId) {
    return this.registry.get(triggerId)?.getScopeForPreview() ?? {};
  }

  getEventScopeFromActionContext<T extends TriggerId>(context: TriggerContextMapping[T]) {
    const matchingTrigger = Array.from(this.registry.values()).find((triggerDescriptor) =>
      triggerDescriptor.isTriggerContext(context)
    );
    if (!matchingTrigger) return {};
    return matchingTrigger.getScopeFromActionContext(context);
  }
}
