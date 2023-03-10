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
export * from './alerts_grouping';
export const getDefaultGroupingOptions = (): GroupOption[] => {
  return [
    {
      label: `Rule Name`,
      key: 'kibana.alert.rule.name',
    },
    {
      label: `Rule Category`,
      key: 'kibana.alert.rule.category',
    },
    {
      label: `Host Name`,
      key: 'host.name',
    },
    {
      label: `Agent Name`,
      key: 'agent.name',
    },
  ];
};
