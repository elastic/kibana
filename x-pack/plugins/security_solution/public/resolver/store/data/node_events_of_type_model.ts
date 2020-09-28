/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PanelViewAndParameters, NodeEventsOfTypeState } from '../../types';

/**
 * True if `nodeEventsOfType` contains data that is relevant to `panelViewAndParameters`.
 */
export function isValid(
  nodeEventsOfType: NodeEventsOfTypeState,
  panelViewAndParameters: PanelViewAndParameters
): boolean {
  return (
    panelViewAndParameters.panelView === 'nodeEventsOfType' &&
    panelViewAndParameters.panelParameters.nodeID === nodeEventsOfType.nodeID &&
    panelViewAndParameters.panelParameters.eventCategory === nodeEventsOfType.eventCategory
  );
}

/**
 * Return an updated `NodeEventsOfTypeState` that has data from `first` and `second`. The `cursor` from `second` is used.
 * Returns undefined if `first` and `second` don't contain data form the same set.
 */
export function updatedWith(
  first: NodeEventsOfTypeState,
  second: NodeEventsOfTypeState
): NodeEventsOfTypeState | undefined {
  if (first.nodeID === second.nodeID && first.eventCategory === second.eventCategory) {
    return {
      nodeID: first.nodeID,
      eventCategory: first.eventCategory,
      events: [...first.events, ...second.events],
      cursor: second.cursor,
    };
  } else {
    return undefined;
  }
}
