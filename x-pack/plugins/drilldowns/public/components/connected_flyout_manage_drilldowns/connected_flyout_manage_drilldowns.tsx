/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import useMount from 'react-use/lib/useMount';
import useMountedState from 'react-use/lib/useMountedState';
import {
  AdvancedUiActionsAnyActionFactory as AnyActionFactory,
  AdvancedUiActionsStart,
} from '../../../../advanced_ui_actions/public';
import { NotificationsStart } from '../../../../../../src/core/public';
import { DrilldownWizardConfig, FlyoutDrilldownWizard } from '../flyout_drilldown_wizard';
import { FlyoutListManageDrilldowns } from '../flyout_list_manage_drilldowns';
import { IStorageWrapper } from '../../../../../../src/plugins/kibana_utils/public';
import {
  DynamicActionManager,
  UiActionsSerializedEvent,
  UiActionsSerializedAction,
} from '../../../../../../src/plugins/ui_actions/public';
import { DrilldownListItem } from '../list_manage_drilldowns';
import {
  toastDrilldownCreated,
  toastDrilldownDeleted,
  toastDrilldownEdited,
  toastDrilldownsCRUDError,
  toastDrilldownsDeleted,
  toastDrilldownsFetchError,
} from './i18n';

interface ConnectedFlyoutManageDrilldownsProps<Context extends object = object> {
  context: Context;
  dynamicActionManager: DynamicActionManager;
  viewMode?: 'create' | 'manage';
  onClose?: () => void;
}

/**
 * Represent current state (route) of FlyoutManageDrilldowns
 */
enum Routes {
  Manage = 'manage',
  Create = 'create',
  Edit = 'edit',
}

export function createFlyoutManageDrilldowns({
  advancedUiActions,
  storage,
  notifications,
}: {
  advancedUiActions: AdvancedUiActionsStart;
  storage: IStorageWrapper;
  notifications: NotificationsStart;
}) {
  // fine to assume this is static,
  // because all action factories should be registered in setup phase
  const allActionFactories = advancedUiActions.getActionFactories();
  const allActionFactoriesById = allActionFactories.reduce((acc, next) => {
    acc[next.id] = next;
    return acc;
  }, {} as Record<string, AnyActionFactory>);

  return (props: ConnectedFlyoutManageDrilldownsProps) => {
    const isCreateOnly = props.viewMode === 'create';

    const actionFactories = useCompatibleActionFactoriesForCurrentContext(
      allActionFactories,
      props.context
    );

    const [route, setRoute] = useState<Routes>(
      () => (isCreateOnly ? Routes.Create : Routes.Manage) // initial state is different depending on `viewMode`
    );
    const [currentEditId, setCurrentEditId] = useState<string | null>(null);

    const [shouldShowWelcomeMessage, onHideWelcomeMessage] = useWelcomeMessage(storage);

    const {
      drilldowns,
      createDrilldown,
      editDrilldown,
      deleteDrilldown,
    } = useDrilldownsStateManager(props.dynamicActionManager, notifications);

    /**
     * isCompatible promise is not yet resolved.
     * Skip rendering until it is resolved
     */
    if (!actionFactories) return null;
    /**
     * Drilldowns are not fetched yet or error happened during fetching
     * In case of error user is notified with toast
     */
    if (!drilldowns) return null;

    /**
     * Needed for edit mode to prefill wizard fields with data from current edited drilldown
     */
    function resolveInitialDrilldownWizardConfig(): DrilldownWizardConfig | undefined {
      if (route !== Routes.Edit) return undefined;
      if (!currentEditId) return undefined;
      const drilldownToEdit = drilldowns?.find(d => d.eventId === currentEditId);
      if (!drilldownToEdit) return undefined;

      return {
        actionFactory: allActionFactoriesById[drilldownToEdit.action.factoryId],
        actionConfig: drilldownToEdit.action.config as object, // TODO: config is unknown, but we know it always extends object
        name: drilldownToEdit.action.name,
      };
    }

    /**
     * Maps drilldown to list item view model
     */
    function mapToDrilldownToDrilldownListItem(
      drilldown: UiActionsSerializedEvent
    ): DrilldownListItem {
      return {
        id: drilldown.eventId,
        drilldownName: drilldown.action.name,
        actionName:
          allActionFactoriesById[drilldown.action.factoryId]?.getDisplayName(props.context) ??
          drilldown.action.factoryId,
      };
    }

    switch (route) {
      case Routes.Create:
      case Routes.Edit:
        return (
          <FlyoutDrilldownWizard
            showWelcomeMessage={shouldShowWelcomeMessage}
            onWelcomeHideClick={onHideWelcomeMessage}
            drilldownActionFactories={actionFactories}
            onClose={props.onClose}
            mode={route === Routes.Create ? 'create' : 'edit'}
            onBack={isCreateOnly ? undefined : () => setRoute(Routes.Manage)}
            onSubmit={({ actionConfig, actionFactory, name }) => {
              if (route === Routes.Create) {
                createDrilldown({
                  name,
                  config: actionConfig,
                  factoryId: actionFactory.id,
                });
              } else {
                // edit
                editDrilldown(currentEditId!, {
                  name,
                  config: actionConfig,
                  factoryId: actionFactory.id,
                });
              }

              if (isCreateOnly) {
                if (props.onClose) {
                  props.onClose();
                }
              } else {
                setRoute(Routes.Manage);
              }

              setCurrentEditId(null);
            }}
            onDelete={() => {
              deleteDrilldown(currentEditId!);
              setRoute(Routes.Manage);
              setCurrentEditId(null);
            }}
            actionFactoryContext={props.context}
            initialDrilldownWizardConfig={resolveInitialDrilldownWizardConfig()}
          />
        );

      case Routes.Manage:
      default:
        return (
          <FlyoutListManageDrilldowns
            showWelcomeMessage={shouldShowWelcomeMessage}
            onWelcomeHideClick={onHideWelcomeMessage}
            drilldowns={drilldowns.map(mapToDrilldownToDrilldownListItem)}
            onDelete={ids => {
              setCurrentEditId(null);
              deleteDrilldown(ids);
            }}
            onEdit={id => {
              setCurrentEditId(id);
              setRoute(Routes.Edit);
            }}
            onCreate={() => {
              setCurrentEditId(null);
              setRoute(Routes.Create);
            }}
            onClose={props.onClose}
          />
        );
    }
  };
}

function useCompatibleActionFactoriesForCurrentContext<Context extends object = object>(
  actionFactories: AnyActionFactory[],
  context: Context
) {
  const [compatibleActionFactories, setCompatibleActionFactories] = useState<AnyActionFactory[]>();
  useEffect(() => {
    let canceled = false;
    async function updateCompatibleFactoriesForContext() {
      const compatibility = await Promise.all(
        actionFactories.map(factory => factory.isCompatible(context))
      );
      if (canceled) return;
      setCompatibleActionFactories(actionFactories.filter((_, i) => compatibility[i]));
    }
    updateCompatibleFactoriesForContext();
    return () => {
      canceled = true;
    };
  }, [context, actionFactories]);

  return compatibleActionFactories;
}

function useWelcomeMessage(storage: IStorageWrapper): [boolean, () => void] {
  const key = `drilldowns:hidWelcomeMessage`;
  const [hidWelcomeMessage, setHidWelcomeMessage] = useState<boolean>(storage.get(key) ?? false);

  return [
    !hidWelcomeMessage,
    () => {
      if (hidWelcomeMessage) return;
      setHidWelcomeMessage(true);
      storage.set(key, true);
    },
  ];
}

function useDrilldownsStateManager(
  actionManager: DynamicActionManager,
  notifications: NotificationsStart
) {
  const [isLoading, setIsLoading] = useState(false);
  const [drilldowns, setDrilldowns] = useState<UiActionsSerializedEvent[]>();
  const isMounted = useMountedState();

  async function run(op: () => Promise<void>) {
    setIsLoading(true);
    try {
      await op();
    } catch (e) {
      notifications.toasts.addError(e, {
        title: toastDrilldownsCRUDError,
      });
      if (!isMounted) return;
      setIsLoading(false);
      return;
    }

    await reload();
  }

  async function reload() {
    if (!isMounted) {
      // don't do any side effects anymore because component is already unmounted
      return;
    }
    if (!isLoading) {
      setIsLoading(true);
    }
    try {
      const drilldownsList = await actionManager.list();
      if (!isMounted) {
        return;
      }
      setDrilldowns(drilldownsList);
      setIsLoading(false);
    } catch (e) {
      notifications.toasts.addError(e, {
        title: toastDrilldownsFetchError,
      });
    }
  }

  useMount(() => {
    reload();
  });

  async function createDrilldown(action: UiActionsSerializedAction<any>, triggerId?: string) {
    await run(async () => {
      await actionManager.createEvent(action, triggerId);
      notifications.toasts.addSuccess({
        title: toastDrilldownCreated.title,
        text: toastDrilldownCreated.text(action.name),
      });
    });
  }

  async function editDrilldown(
    drilldownId: string,
    action: UiActionsSerializedAction<any>,
    triggerId?: string
  ) {
    await run(async () => {
      await actionManager.updateEvent(drilldownId, action, triggerId);
      notifications.toasts.addSuccess({
        title: toastDrilldownEdited.title,
        text: toastDrilldownEdited.text(action.name),
      });
    });
  }

  async function deleteDrilldown(drilldownIds: string | string[]) {
    await run(async () => {
      drilldownIds = Array.isArray(drilldownIds) ? drilldownIds : [drilldownIds];
      await actionManager.deleteEvents(drilldownIds);
      notifications.toasts.addSuccess(
        drilldownIds.length === 1
          ? {
              title: toastDrilldownDeleted.title,
              text: toastDrilldownDeleted.text,
            }
          : {
              title: toastDrilldownsDeleted.title,
              text: toastDrilldownsDeleted.text(drilldownIds.length),
            }
      );
    });
  }

  return { drilldowns, isLoading, createDrilldown, editDrilldown, deleteDrilldown };
}
