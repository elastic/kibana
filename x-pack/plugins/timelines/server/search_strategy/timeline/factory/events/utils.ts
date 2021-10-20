/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertConsumers, ALERT_RULE_CONSUMER } from '@kbn/rule-data-utils';

export const getAlertConsumersFilter = (alertConsumersToInclude: AlertConsumers[] | undefined) => {
  if (alertConsumersToInclude == null || !alertConsumersToInclude.length) {
    return [];
  }

  const consumerFilter = alertConsumersToInclude.map((consumer) => {
    return {
      bool: {
        should: [{ match: { [ALERT_RULE_CONSUMER]: consumer } }],
        minimum_should_match: 1,
      },
    };
  });

  return [
    {
      bool: {
        filter: [
          {
            bool: {
              should: consumerFilter,
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
  ];
};
