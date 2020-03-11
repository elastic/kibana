/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import {
  AdvancedUiActionsActionFactory as ActionFactory,
  AdvancedUiActionsStart,
} from '../../../../advanced_ui_actions/public';
import { DrilldownWizardConfig, FlyoutDrilldownWizard } from '../flyout_drilldown_wizard';
import { FlyoutListManageDrilldowns } from '../flyout_list_manage_drilldowns';
import { IStorageWrapper } from '../../../../../../src/plugins/kibana_utils/public';

import {
  AnyActionFactory,
  DynamicActionManager,
  UiActionsSerializedEvent,
  UiActionsSerializedAction,
} from '../../../../../../src/plugins/ui_actions/public';

interface ConnectedFlyoutManageDrilldownsProps<Context extends object = object> {
  context: Context;
  dynamicActionsManager: DynamicActionManager;
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
}: {
  advancedUiActions: AdvancedUiActionsStart;
  storage: IStorageWrapper;
}) {
  // This is ok to assume this is static,
  // because all action factories should be registered in setup phase
  const allActionFactories = advancedUiActions.actionFactory.getAll();
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
    } = useDrilldownsStateManager(props.dynamicActionsManager);

    /**
     * isCompatible promise is not yet resolved.
     * Skip rendering until it is resolved
     */
    if (!actionFactories) return null;

    function resolveInitialDrilldownWizardConfig(): DrilldownWizardConfig | undefined {
      if (route !== Routes.Edit) return undefined;
      if (!currentEditId) return undefined;
      const drilldownToEdit = drilldowns.find(d => d.eventId === currentEditId);
      if (!drilldownToEdit) return undefined;

      return {
        actionFactory: allActionFactoriesById[drilldownToEdit.action.factoryId],
        actionConfig: drilldownToEdit.action.config as object, // TODO: types
        name: drilldownToEdit.action.name,
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
            drilldowns={drilldowns.map(drilldown => ({
              id: drilldown.eventId,
              name: drilldown.action.name,
              actionTypeDisplayName:
                allActionFactoriesById[drilldown.action.factoryId]?.getDisplayName(props.context) ??
                drilldown.action.factoryId,
            }))}
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
            context={props.context}
          />
        );
    }
  };
}

function useCompatibleActionFactoriesForCurrentContext<Context extends object = object>(
  actionFactories: Array<ActionFactory<any>>,
  context: Context
) {
  const [compatibleActionFactories, setCompatibleActionFactories] = useState<
    Array<ActionFactory<any>>
  >();
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

function useDrilldownsStateManager(actionManager: DynamicActionManager) {
  const [isLoading, setIsLoading] = useState(false);
  const [drilldowns, setDrilldowns] = useState<UiActionsSerializedEvent[]>([]);

  function reload() {
    setIsLoading(true);
    actionManager.list().then(res => {
      setDrilldowns(res);
      setIsLoading(false);
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function createDrilldown(action: UiActionsSerializedAction<any>, triggerId?: string) {
    setIsLoading(true);
    actionManager.createEvent(action, triggerId).then(() => {
      setIsLoading(false);
      reload();
    });
  }

  function editDrilldown(
    drilldownId: string,
    action: UiActionsSerializedAction<any>,
    triggerId?: string
  ) {
    setIsLoading(true);
    actionManager.updateEvent(drilldownId, action, triggerId).then(() => {
      setIsLoading(false);
      reload();
    });
  }

  function deleteDrilldown(drilldownIds: string | string[]) {
    setIsLoading(true);
    actionManager
      .deleteEvents(Array.isArray(drilldownIds) ? drilldownIds : [drilldownIds])
      .then(() => {
        setIsLoading(false);
        reload();
      });
  }

  return { drilldowns, isLoading, createDrilldown, editDrilldown, deleteDrilldown };
}
