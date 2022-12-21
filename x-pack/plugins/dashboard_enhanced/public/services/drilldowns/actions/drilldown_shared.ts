/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APPLY_FILTER_TRIGGER } from '@kbn/data-plugin/public';
import {
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
  IEmbeddable,
  Container as EmbeddableContainer,
} from '@kbn/embeddable-plugin/public';
import { isEnhancedEmbeddable } from '@kbn/embeddable-enhanced-plugin/public';
import { UiActionsEnhancedDrilldownTemplate as DrilldownTemplate } from '@kbn/ui-actions-enhanced-plugin/public';

/**
 * We know that VALUE_CLICK_TRIGGER and SELECT_RANGE_TRIGGER are also triggering APPLY_FILTER_TRIGGER.
 * This function appends APPLY_FILTER_TRIGGER to the list of triggers if either VALUE_CLICK_TRIGGER
 * or SELECT_RANGE_TRIGGER was executed.
 *
 * TODO: this probably should be part of uiActions infrastructure,
 * but dynamic implementation of nested trigger doesn't allow to statically express such relations
 *
 * @param triggers
 */
export function ensureNestedTriggers(triggers: string[]): string[] {
  if (
    !triggers.includes(APPLY_FILTER_TRIGGER) &&
    (triggers.includes(VALUE_CLICK_TRIGGER) || triggers.includes(SELECT_RANGE_TRIGGER))
  ) {
    return [...triggers, APPLY_FILTER_TRIGGER];
  }

  return triggers;
}

const isEmbeddableContainer = (x: unknown): x is EmbeddableContainer =>
  x instanceof EmbeddableContainer;

/**
 * Given a dashboard panel embeddable, it will find the parent (dashboard
 * container embeddable), then iterate through all the dashboard panels and
 * generate DrilldownTemplate for each existing drilldown.
 */
export const createDrilldownTemplatesFromSiblings = (
  embeddable: IEmbeddable
): DrilldownTemplate[] => {
  const templates: DrilldownTemplate[] = [];
  const embeddableId = embeddable.id;

  const container = embeddable.getRoot();

  if (!container) return templates;
  if (!isEmbeddableContainer(container)) return templates;

  const childrenIds = (container as EmbeddableContainer).getChildIds();

  for (const childId of childrenIds) {
    const child = (container as EmbeddableContainer).getChild(childId);
    if (child.id === embeddableId) continue;
    if (!isEnhancedEmbeddable(child)) continue;
    const events = child.enhancements.dynamicActions.state.get().events;

    for (const event of events) {
      const template: DrilldownTemplate = {
        id: event.eventId,
        name: event.action.name,
        icon: 'dashboardApp',
        description: child.getTitle() || child.id,
        config: event.action.config,
        factoryId: event.action.factoryId,
        triggers: event.triggers,
      };
      templates.push(template);
    }
  }

  return templates;
};
