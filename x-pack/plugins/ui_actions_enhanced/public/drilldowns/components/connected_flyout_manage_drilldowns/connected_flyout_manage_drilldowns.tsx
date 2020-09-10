/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { ToastsStart } from 'kibana/public';
import useMountedState from 'react-use/lib/useMountedState';
import intersection from 'lodash/intersection';
import { DrilldownWizardConfig, FlyoutDrilldownWizard } from '../flyout_drilldown_wizard';
import { FlyoutListManageDrilldowns } from '../flyout_list_manage_drilldowns';
import { IStorageWrapper } from '../../../../../../../src/plugins/kibana_utils/public';
import { Trigger, TriggerId } from '../../../../../../../src/plugins/ui_actions/public';
import { useContainerState } from '../../../../../../../src/plugins/kibana_utils/public';
import { DrilldownListItem } from '../list_manage_drilldowns';
import {
  insufficientLicenseLevel,
  invalidDrilldownType,
  toastDrilldownCreated,
  toastDrilldownDeleted,
  toastDrilldownEdited,
  toastDrilldownsCRUDError,
  toastDrilldownsDeleted,
} from './i18n';
import {
  ActionFactory,
  BaseActionFactoryContext,
  DynamicActionManager,
  SerializedAction,
  SerializedEvent,
} from '../../../dynamic_actions';
import { ActionFactoryPlaceContext } from '../types';

interface ConnectedFlyoutManageDrilldownsProps<
  ActionFactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
> {
  dynamicActionManager: DynamicActionManager;
  viewMode?: 'create' | 'manage';
  onClose?: () => void;

  /**
   * List of possible triggers in current context
   */
  supportedTriggers: TriggerId[];

  /**
   * Extra action factory context passed into action factories CollectConfig, getIconType, getDisplayName and etc...
   */
  placeContext?: ActionFactoryPlaceContext<ActionFactoryContext>;
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
  actionFactories: allActionFactories,
  storage,
  toastService,
  docsLink,
  triggerPickerDocsLink,
  getTrigger,
}: {
  actionFactories: ActionFactory[];
  getTrigger: (triggerId: TriggerId) => Trigger;
  storage: IStorageWrapper;
  toastService: ToastsStart;
  docsLink?: string;
  triggerPickerDocsLink?: string;
}) {
  const allActionFactoriesById = allActionFactories.reduce((acc, next) => {
    acc[next.id] = next;
    return acc;
  }, {} as Record<string, ActionFactory>);

  return (props: ConnectedFlyoutManageDrilldownsProps) => {
    const isCreateOnly = props.viewMode === 'create';

    const factoryContext: BaseActionFactoryContext = useMemo(
      () => ({ ...props.placeContext, triggers: props.supportedTriggers }),
      [props.placeContext, props.supportedTriggers]
    );
    const actionFactories = useCompatibleActionFactoriesForCurrentContext(
      allActionFactories,
      factoryContext
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
    } = useDrilldownsStateManager(props.dynamicActionManager, toastService);

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
      const drilldownToEdit = drilldowns?.find((d) => d.eventId === currentEditId);
      if (!drilldownToEdit) return undefined;

      return {
        actionFactory: allActionFactoriesById[drilldownToEdit.action.factoryId],
        actionConfig: drilldownToEdit.action.config as object,
        name: drilldownToEdit.action.name,
        selectedTriggers: (drilldownToEdit.triggers ?? []) as TriggerId[],
      };
    }

    /**
     * Maps drilldown to list item view model
     */
    function mapToDrilldownToDrilldownListItem(drilldown: SerializedEvent): DrilldownListItem {
      const actionFactory = allActionFactoriesById[drilldown.action.factoryId];
      const drilldownFactoryContext: BaseActionFactoryContext = {
        ...props.placeContext,
        triggers: drilldown.triggers as TriggerId[],
      };
      return {
        id: drilldown.eventId,
        drilldownName: drilldown.action.name,
        actionName:
          actionFactory?.getDisplayName(drilldownFactoryContext) ?? drilldown.action.factoryId,
        icon: actionFactory?.getIconType(drilldownFactoryContext),
        error: !actionFactory
          ? invalidDrilldownType(drilldown.action.factoryId) // this shouldn't happen for the end user, but useful during development
          : !actionFactory.isCompatibleLicense()
          ? insufficientLicenseLevel
          : undefined,
        triggers: drilldown.triggers.map((trigger) => getTrigger(trigger as TriggerId)),
      };
    }

    switch (route) {
      case Routes.Create:
      case Routes.Edit:
        return (
          <FlyoutDrilldownWizard
            docsLink={docsLink}
            triggerPickerDocsLink={triggerPickerDocsLink}
            showWelcomeMessage={shouldShowWelcomeMessage}
            onWelcomeHideClick={onHideWelcomeMessage}
            drilldownActionFactories={actionFactories}
            onClose={props.onClose}
            mode={route === Routes.Create ? 'create' : 'edit'}
            onBack={isCreateOnly ? undefined : () => setRoute(Routes.Manage)}
            onSubmit={({ actionConfig, actionFactory, name, selectedTriggers }) => {
              if (route === Routes.Create) {
                createDrilldown(
                  {
                    name,
                    config: actionConfig,
                    factoryId: actionFactory.id,
                  },
                  selectedTriggers
                );
              } else {
                editDrilldown(
                  currentEditId!,
                  {
                    name,
                    config: actionConfig,
                    factoryId: actionFactory.id,
                  },
                  selectedTriggers
                );
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
            actionFactoryPlaceContext={props.placeContext}
            initialDrilldownWizardConfig={resolveInitialDrilldownWizardConfig()}
            supportedTriggers={props.supportedTriggers}
            getTrigger={getTrigger}
          />
        );

      case Routes.Manage:
      default:
        // show trigger column in case if there is more then 1 possible trigger in current context
        const showTriggerColumn =
          intersection(
            props.supportedTriggers,
            actionFactories
              .map((factory) => factory.supportedTriggers())
              .reduce((res, next) => res.concat(next), [])
          ).length > 1;
        return (
          <FlyoutListManageDrilldowns
            docsLink={docsLink}
            showWelcomeMessage={shouldShowWelcomeMessage}
            onWelcomeHideClick={onHideWelcomeMessage}
            drilldowns={drilldowns.map(mapToDrilldownToDrilldownListItem)}
            onDelete={(ids) => {
              setCurrentEditId(null);
              deleteDrilldown(ids);
            }}
            onEdit={(id) => {
              setCurrentEditId(id);
              setRoute(Routes.Edit);
            }}
            onCreate={() => {
              setCurrentEditId(null);
              setRoute(Routes.Create);
            }}
            onClose={props.onClose}
            showTriggerColumn={showTriggerColumn}
          />
        );
    }
  };
}

function useCompatibleActionFactoriesForCurrentContext<
  Context extends BaseActionFactoryContext = BaseActionFactoryContext
>(actionFactories: ActionFactory[], context: Context) {
  const [compatibleActionFactories, setCompatibleActionFactories] = useState<ActionFactory[]>();
  useEffect(() => {
    let canceled = false;
    async function updateCompatibleFactoriesForContext() {
      const compatibility = await Promise.all(
        actionFactories.map((factory) => factory.isCompatible(context))
      );
      if (canceled) return;

      const compatibleFactories = actionFactories.filter((_, i) => compatibility[i]);
      const triggerSupportedFactories = compatibleFactories.filter((factory) =>
        factory.supportedTriggers().some((trigger) => context.triggers.includes(trigger))
      );
      setCompatibleActionFactories(triggerSupportedFactories);
    }
    updateCompatibleFactoriesForContext();
    return () => {
      canceled = true;
    };
  }, [context, actionFactories, context.triggers]);

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

function useDrilldownsStateManager(actionManager: DynamicActionManager, toastService: ToastsStart) {
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
