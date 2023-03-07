/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GroupOption } from '@kbn/securitysolution-grouping';

export * from './group_stats';
export * from './group_panel_renderers';
export * from './group_stats';
export * from './query_builder';
export const getDefaultGroupingOptions = (): GroupOption[] => {
  return [
    {
      label: `i18n.ruleName`,
      key: 'kibana.alert.rule.name',
    },
    {
      label: `i18n.userName`,
      key: 'user.name',
    },
    {
      label: `i18n.hostName`,
      key: 'host.name',
    },
    {
      label: `i18n.sourceIP`,
      key: 'source.ip',
    },
  ];
};
