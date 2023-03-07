/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import { RenderCustomActionsRowArgs } from '@kbn/triggers-actions-ui-plugin/public/types';
import { ObservabilityRuleTypeRegistry } from '../../../../rules/create_observability_rule_type_registry';
import { ObservabilityActions } from '../../components/observability_actions';
import type { ObservabilityActionsProps } from '../../components/observability_actions';
import type { ConfigSchema } from '../../../../plugin';

const buildData = (alerts: EcsFieldsResponse): ObservabilityActionsProps['data'] => {
  return Object.entries(alerts).reduce<ObservabilityActionsProps['data']>(
    (acc, [field, value]) => [...acc, { field, value: value as string[] }],
    []
  );
};
export const getRowActions = (
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry,
  config: ConfigSchema
) => {
  return () => ({
    renderCustomActionsRow: ({ alert, setFlyoutAlert, id }: RenderCustomActionsRowArgs) => {
      return (
        <ObservabilityActions
          data={buildData(alert)}
          eventId={alert._id}
          ecsData={{ _id: alert._id, _index: alert._index }}
          id={id}
          observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
          setFlyoutAlert={setFlyoutAlert}
          config={config}
        />
      );
    },
    width: 120,
  });
};
