/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_ALERTS_INDEX = '.alerts-default';
export const ILM_POLICY_NAME = 'alerts-default-policy';
export const INDEX_TEMPLATE_NAME = 'alerts-default-template';
export const DEFAULT_ILM_POLICY = {
  policy: {
    _meta: {
      managed: true,
    },
    phases: {
      hot: {
        actions: {
          rollover: {
            max_age: '30d',
            max_primary_shard_size: '50gb',
          },
        },
      },
    },
  },
};
export const ALERTS_COMPONENT_TEMPLATE_NAME = 'alerts-mappings';
export const ECS_COMPONENT_TEMPLATE_NAME = 'ecs-mappings';
