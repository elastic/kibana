/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import { ObservabilityRuleTypeRegistry } from '../../../../rules/create_observability_rule_type_registry';
import { ObservabilityActions } from './alerts_table_t_grid';
import type { ObservabilityActionsProps } from './alerts_table_t_grid';

const buildData = (alerts: EcsFieldsResponse): ObservabilityActionsProps['data'] => {
  return Object.entries(alerts).reduce<ObservabilityActionsProps['data']>(
    (acc, [field, value]) => [...acc, { field, value }],
    []
  );
};
const fakeSetEventsDeleted = () => [];
export const getRowActions = (observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry) => {
  return () => ({
    renderCustomActionsRow: (alert: EcsFieldsResponse, setFlyoutAlert: (data: unknown) => void) => {
      return (
        <ObservabilityActions
          data={buildData(alert)}
          eventId={alert._id}
          ecsData={{ _id: alert._id, _index: alert._index }}
          observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
          setEventsDeleted={fakeSetEventsDeleted}
          setFlyoutAlert={setFlyoutAlert}
        />
      );
    },
    width: 120,
  });
};
