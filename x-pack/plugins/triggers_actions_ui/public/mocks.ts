/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TriggersAndActionsUIPublicPluginStart } from './plugin';

import { getAddConnectorFlyoutLazy } from './common/get_add_connector_flyout';
import { getEditConnectorFlyoutLazy } from './common/get_edit_connector_flyout';
import { getAddAlertFlyoutLazy } from './common/get_add_alert_flyout';
import { getEditAlertFlyoutLazy } from './common/get_edit_alert_flyout';

import { TypeRegistry } from './application/type_registry';
import {
  ActionTypeModel,
  RuleAddProps,
  RuleEditProps,
  RuleTypeModel,
  ConnectorAddFlyoutProps,
  ConnectorEditFlyoutProps,
  AlertsTableProps,
  AlertsTableConfigurationRegistry,
} from './types';
import { getAlertsTableLazy } from './common/get_alerts_table';
import { getRuleStatusDropdownLazy } from './common/get_rule_status_dropdown';

function createStartMock(): TriggersAndActionsUIPublicPluginStart {
  const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
  const ruleTypeRegistry = new TypeRegistry<RuleTypeModel>();
  const alertsTableConfigurationRegistry = new TypeRegistry<AlertsTableConfigurationRegistry>();
  return {
    actionTypeRegistry,
    ruleTypeRegistry,
    alertsTableConfigurationRegistry,
    getAddConnectorFlyout: (props: Omit<ConnectorAddFlyoutProps, 'actionTypeRegistry'>) => {
      return getAddConnectorFlyoutLazy({ ...props, actionTypeRegistry });
    },
    getEditConnectorFlyout: (props: Omit<ConnectorEditFlyoutProps, 'actionTypeRegistry'>) => {
      return getEditConnectorFlyoutLazy({
        ...props,
        actionTypeRegistry,
      });
    },
    getAddAlertFlyout: (props: Omit<RuleAddProps, 'actionTypeRegistry' | 'ruleTypeRegistry'>) => {
      return getAddAlertFlyoutLazy({
        ...props,
        actionTypeRegistry,
        ruleTypeRegistry,
      });
    },
    getEditAlertFlyout: (props: Omit<RuleEditProps, 'actionTypeRegistry' | 'ruleTypeRegistry'>) => {
      return getEditAlertFlyoutLazy({
        ...props,
        actionTypeRegistry,
        ruleTypeRegistry,
      });
    },
    getAlertsTable: (props: AlertsTableProps) => {
      return getAlertsTableLazy(props);
    },
    getRuleStatusDropdown: (props) => {
      return getRuleStatusDropdownLazy(props);
    },
  };
}

export const triggersActionsUiMock = {
  createStart: createStartMock,
};
