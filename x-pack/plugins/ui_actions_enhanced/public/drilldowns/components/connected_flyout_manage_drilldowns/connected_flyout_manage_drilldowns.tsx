/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';
import { ToastsStart } from 'kibana/public';
import { intersection } from 'lodash';
import { DrilldownWizardConfig, FlyoutDrilldownWizard } from '../flyout_drilldown_wizard';
import { FlyoutListManageDrilldowns } from '../flyout_list_manage_drilldowns';
import { IStorageWrapper } from '../../../../../../../src/plugins/kibana_utils/public';
import { Trigger, TriggerId } from '../../../../../../../src/plugins/ui_actions/public';
import { DrilldownListItem } from '../list_manage_drilldowns';
import { insufficientLicenseLevel, invalidDrilldownType } from './i18n';
import {
  ActionFactory,
  BaseActionConfig,
  BaseActionFactoryContext,
  DynamicActionManager,
  SerializedEvent,
} from '../../../dynamic_actions';
import { useWelcomeMessage } from '../../hooks/use_welcome_message';
import { useCompatibleActionFactoriesForCurrentContext } from '../../hooks/use_compatible_action_factories_for_current_context';
import { useDrilldownsStateManager } from '../../hooks/use_drilldown_state_manager';
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
  triggers: TriggerId[];

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
}): React.FC<ConnectedFlyoutManageDrilldownsProps> {
  const allActionFactoriesById = allActionFactories.reduce((acc, next) => {
    acc[next.id] = next;
    return acc;
  }, {} as Record<string, ActionFactory>);

  return (props: ConnectedFlyoutManageDrilldownsProps) => {
    const isCreateOnly = props.viewMode === 'create';

    const factoryContext: BaseActionFactoryContext = useMemo(
      () => ({ ...props.placeContext, triggers: props.triggers }),
      [props.placeContext, props.triggers]
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
        actionConfig: drilldownToEdit.action.config as BaseActionConfig,
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
            supportedTriggers={props.triggers}
            getTrigger={getTrigger}
          />
        );

      case Routes.Manage:
      default:
        // show trigger column in case if there is more then 1 possible trigger in current context
        const showTriggerColumn =
          intersection(
            props.triggers,
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
