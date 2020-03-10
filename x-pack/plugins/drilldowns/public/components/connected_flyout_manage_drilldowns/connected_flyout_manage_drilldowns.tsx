/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { ActionFactory, AdvancedUiActionsStart } from '../../../../advanced_ui_actions/public';
import { FlyoutDrilldownWizard } from '../flyout_drilldown_wizard';
import { FlyoutListManageDrilldowns } from '../flyout_list_manage_drilldowns';
import { IStorageWrapper } from '../../../../../../src/plugins/kibana_utils/public';

interface ConnectedFlyoutManageDrilldownsProps<Context extends object = object> {
  context: Context;
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
  // because all action factories should be registerd in setup phase
  const allActionFactories = advancedUiActions.actionFactory.getAll();

  return (props: ConnectedFlyoutManageDrilldownsProps) => {
    const isCreateOnly = props.viewMode === 'create';

    const actionFactories = useCompatibleActionFactoriesForCurrentContext(
      allActionFactories,
      props.context
    );

    const [route, setRoute] = useState<Routes>(
      () => (isCreateOnly ? Routes.Create : Routes.Manage) // initial state is different depending on `viewMode`
    );

    const [shouldShowWelcomeMessage, onHideWelcomeMessage] = useWelcomeMessage(storage);

    /**
     * isCompatible promise is not yet resolved.
     * Skip rendering until it is resolved
     */
    if (!actionFactories) return null;

    switch (route) {
      case Routes.Create:
      case Routes.Edit:
        return (
          <FlyoutDrilldownWizard
            showWelcomeMessage={shouldShowWelcomeMessage}
            onWelcomeHideClick={onHideWelcomeMessage}
            drilldownActionFactories={actionFactories}
            onClose={props.onClose}
            mode={Routes.Create ? 'create' : 'edit'}
            onBack={isCreateOnly ? undefined : () => setRoute(Routes.Manage)}
            onSubmit={() => {
              if (isCreateOnly) {
                if (props.onClose) {
                  props.onClose();
                }
              } else {
                setRoute(Routes.Manage);
              }
            }}
            onDelete={() => {
              setRoute(Routes.Manage);
            }}
          />
        );

      case Routes.Manage:
      default:
        return (
          <FlyoutListManageDrilldowns
            showWelcomeMessage={shouldShowWelcomeMessage}
            onWelcomeHideClick={onHideWelcomeMessage}
            drilldowns={[]}
            onDelete={() => {}}
            onEdit={() => {
              setRoute(Routes.Edit);
            }}
            onCreate={() => {
              setRoute(Routes.Create);
            }}
            onClose={props.onClose}
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
