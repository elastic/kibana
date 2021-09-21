/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_INSTANCE_ID, VERSION } from '@kbn/rule-data-utils';
import { getCommonAlertFields } from './get_common_alert_fields';
import { CreatePersistenceRuleTypeFactory } from './persistence_types';

export const createPersistenceRuleTypeFactory: CreatePersistenceRuleTypeFactory =
  ({ logger, ruleDataClient }) =>
  (type) => {
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
                const commonRuleFields = getCommonAlertFields(options);

                const response = await ruleDataClient.getWriter().bulk({
                  body: alerts.flatMap((alert) => [
                    { index: {} },
                    {
                      [ALERT_INSTANCE_ID]: alert.id,
                      [VERSION]: ruleDataClient.kibanaVersion,
                      ...commonRuleFields,
                      ...alert.fields,
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
