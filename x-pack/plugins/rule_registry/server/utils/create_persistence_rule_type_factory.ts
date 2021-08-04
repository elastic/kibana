/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ID } from '@kbn/rule-data-utils/target/technical_field_names';
import { CreatePersistenceRuleTypeFactory } from './persistence_types';

export const createPersistenceRuleTypeFactory: CreatePersistenceRuleTypeFactory = ({
  logger,
  ruleDataClient,
}) => (type) => {
  return {
    ...type,
    executor: async (options) => {
      const state = await type.executor({
        ...options,
        services: {
          ...options.services,
          alertWithPersistence: async (alerts, refresh) => {
            const numAlerts = alerts.length;
            logger.debug(`Found ${numAlerts} alerts.`);

            if (ruleDataClient.isWriteEnabled() && numAlerts) {
              const response = await ruleDataClient.getWriter().bulk({
                body: alerts.flatMap((event) => [
                  { index: {} },
                  {
                    [ALERT_ID]: event.id,
                    ...event.fields,
                  },
                ]),
                refresh,
              });
              return response;
            } else {
              logger.debug('Writing is disabled.');
            }
          },
        },
      });

      return state;
    },
  };
};
