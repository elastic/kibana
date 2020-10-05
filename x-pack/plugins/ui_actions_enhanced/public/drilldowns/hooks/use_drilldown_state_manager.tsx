/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';
import { ToastsStart } from 'kibana/public';
import useMountedState from 'react-use/lib/useMountedState';
import { TriggerId } from '../../../../../../src/plugins/ui_actions/public';
import { useContainerState } from '../../../../../../src/plugins/kibana_utils/public';
import {
  toastDrilldownCreated,
  toastDrilldownDeleted,
  toastDrilldownEdited,
  toastDrilldownsCRUDError,
  toastDrilldownsDeleted,
} from './i18n';
import { DynamicActionManager, SerializedAction } from '../../dynamic_actions';

export function useDrilldownsStateManager(
  actionManager: DynamicActionManager,
  toastService: ToastsStart
) {
  const { events: drilldowns } = useContainerState(actionManager.state);
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useMountedState();

  async function run(op: () => Promise<void>) {
    setIsLoading(true);
    try {
      await op();
    } catch (e) {
      toastService.addError(e, {
        title: toastDrilldownsCRUDError,
      });
      if (!isMounted) return;
      setIsLoading(false);
      return;
    }
  }

  async function createDrilldown(action: SerializedAction, selectedTriggers: TriggerId[]) {
    await run(async () => {
      await actionManager.createEvent(action, selectedTriggers);
      toastService.addSuccess({
        title: toastDrilldownCreated.title(action.name),
        text: toastDrilldownCreated.text,
      });
    });
  }

  async function editDrilldown(
    drilldownId: string,
    action: SerializedAction,
    selectedTriggers: TriggerId[]
  ) {
    await run(async () => {
      await actionManager.updateEvent(drilldownId, action, selectedTriggers);
      toastService.addSuccess({
        title: toastDrilldownEdited.title(action.name),
        text: toastDrilldownEdited.text,
      });
    });
  }

  async function deleteDrilldown(drilldownIds: string | string[]) {
    await run(async () => {
      drilldownIds = Array.isArray(drilldownIds) ? drilldownIds : [drilldownIds];
      await actionManager.deleteEvents(drilldownIds);
      toastService.addSuccess(
        drilldownIds.length === 1
          ? {
              title: toastDrilldownDeleted.title,
              text: toastDrilldownDeleted.text,
            }
          : {
              title: toastDrilldownsDeleted.title(drilldownIds.length),
              text: toastDrilldownsDeleted.text,
            }
      );
    });
  }

  return { drilldowns, isLoading, createDrilldown, editDrilldown, deleteDrilldown };
}
