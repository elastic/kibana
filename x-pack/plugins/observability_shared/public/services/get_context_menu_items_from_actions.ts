/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItemProps } from '@elastic/eui';
import { buildContextMenuForActions, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ObservabilityTriggerId } from '../../common';

export type ObservabilityActionContextMenuItemProps = EuiContextMenuItemProps & {
  children: React.ReactElement;
};

export function getContextMenuItemsFromActions({
  uiActions,
  triggerId,
  context,
}: {
  uiActions: UiActionsStart;
  triggerId: ObservabilityTriggerId;
  context: Record<string, any>;
}): Promise<ObservabilityActionContextMenuItemProps[]> {
  return uiActions
    .getTriggerCompatibleActions(triggerId, context)
    .then((actions) => {
      return buildContextMenuForActions({
        actions: actions.map((action) => ({
          action,
          trigger: {
            id: triggerId,
          },
          context,
        })),
      });
    })
    .then((descriptors) => {
      return descriptors
        .flatMap((descriptor) => descriptor.items ?? [])
        .map((item) => {
          return {
            ...item,
            children: (item.children || item.name) as React.ReactNode,
          } as ObservabilityActionContextMenuItemProps;
        });
    });
}
