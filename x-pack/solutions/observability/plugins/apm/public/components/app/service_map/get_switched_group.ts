/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode } from '../../../../common/service_map';

export interface SwitchedGroup {
  id: string;
  label: string;
  /** `true` when the group went from closed to open, `false` when it went from open to closed. */
  isOpened: boolean;
}

export interface GroupSwitchResult {
  /** The type of every group in `nodes`: `serviceGroup` when closed, `serviceGroupBox` when open. */
  currentTypes: Map<string, string>;
  /** The group that switched, or the last one if several did. */
  switchedGroup?: SwitchedGroup;
}

/**
 * Tells which group was opened or closed, from the type each group had before (`previousTypes`, the
 * `currentTypes` of the last call) and the nodes now. A group keeps its id when it switches, so
 * only its type tells.
 */
export const getSwitchedGroup = (
  previousTypes: ReadonlyMap<string, string>,
  nodes: readonly ServiceMapNode[]
): GroupSwitchResult => {
  const currentTypes = new Map<string, string>();
  let switchedGroup: SwitchedGroup | undefined;

  for (const { id, type, data } of nodes) {
    if (type !== 'serviceGroup' && type !== 'serviceGroupBox') {
      continue;
    }
    currentTypes.set(id, type);
    const previousType = previousTypes.get(id);
    if (previousType && previousType !== type) {
      switchedGroup = { id, label: data.label || id, isOpened: type === 'serviceGroupBox' };
    }
  }

  return { currentTypes, switchedGroup };
};
