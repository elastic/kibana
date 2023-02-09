/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TableId } from '../../../../../common/types';
import * as i18n from '../translations';

export * from './group_stats';
export * from './group_panel_renderers';
export * from './group_take_action_items';
export * from './query_builder';

export const getDefaultGroupingOptions = (tableId: TableId) => {
  if (tableId === TableId.alertsOnAlertsPage) {
    return [
      {
        label: i18n.ruleName,
        key: 'kibana.alert.rule.name',
      },
      {
        label: i18n.userName,
        key: 'user.name',
      },
      {
        label: i18n.hostName,
        key: 'host.name',
      },
      {
        label: i18n.sourceIP,
        key: 'source.ip',
      },
    ];
  } else if (tableId === TableId.alertsOnRuleDetailsPage) {
    return [
      {
        label: i18n.sourceAddress,
        key: 'source.address',
      },
      {
        label: i18n.userName,
        key: 'user.name',
      },
      {
        label: i18n.hostName,
        key: 'host.name',
      },
      {
        label: i18n.destinationAddress,
        key: 'destination.address,',
      },
    ];
  }
  return [];
};
