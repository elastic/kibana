/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorAddFlyoutProps } from './application/sections/action_connector_form/connector_add_flyout';
import { getAddConnectorFlyoutLazy } from './common/get_add_connector_flyout';
import { ConnectorEditFlyoutProps } from './application/sections/action_connector_form/connector_edit_flyout';
import { getEditConnectorFlyoutLazy } from './common/get_edit_connector_flyout';
import { AlertAddProps } from './application/sections/alert_form/alert_add';
import { getAddAlertFlyoutLazy } from './common/get_add_alert_flyout';
import { AlertEditProps } from './application/sections/alert_form/alert_edit';
import { getEditAlertFlyoutLazy } from './common/get_edit_alert_flyout';
import { TriggersAndActionsUIPublicPluginStart } from './plugin';
import { TypeRegistry } from './application/type_registry';
import { ActionTypeModel, AlertTypeModel } from './types';

function createStartMock(): TriggersAndActionsUIPublicPluginStart {
  const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
  const alertTypeRegistry = new TypeRegistry<AlertTypeModel>();
  return {
    actionTypeRegistry,
    alertTypeRegistry,
    getAddConnectorFlyout: (props: Omit<ConnectorAddFlyoutProps, 'actionTypeRegistry'>) => {
      return getAddConnectorFlyoutLazy({ ...props, actionTypeRegistry });
    },
    getEditConnectorFlyout: (props: Omit<ConnectorEditFlyoutProps, 'actionTypeRegistry'>) => {
      return getEditConnectorFlyoutLazy({
        ...props,
        actionTypeRegistry,
      });
    },
    getAddAlertFlyout: (props: Omit<AlertAddProps, 'actionTypeRegistry' | 'alertTypeRegistry'>) => {
      return getAddAlertFlyoutLazy({
        ...props,
        actionTypeRegistry,
        alertTypeRegistry,
      });
    },
    getEditAlertFlyout: (
      props: Omit<AlertEditProps, 'actionTypeRegistry' | 'alertTypeRegistry'>
    ) => {
      return getEditAlertFlyoutLazy({
        ...props,
        actionTypeRegistry,
        alertTypeRegistry,
      });
    },
  };
}

export const triggersActionsUiMock = {
  createStart: createStartMock,
};
