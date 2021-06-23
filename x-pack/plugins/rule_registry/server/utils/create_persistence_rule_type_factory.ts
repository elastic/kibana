/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/logging';
import { ESSearchRequest } from 'src/core/types/elasticsearch';
import v4 from 'uuid/v4';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../../alerting/common';
import { AlertInstance, AlertType } from '../../../alerting/server';
import { RuleDataClient } from '../rule_data_client';
import { AlertTypeWithExecutor, ExecutorTypeWithExtraServices } from '../types';

type PersistenceAlertService<TAlertInstanceContext extends Record<string, unknown>> = (
  alerts: Array<Record<string, unknown>>
) => Array<AlertInstance<AlertInstanceState, TAlertInstanceContext, string>>;

export interface PersistenceAlertServices<InstanceContext extends AlertInstanceContext = never> {
  alertWithPersistence: PersistenceAlertService<InstanceContext>;
  findAlerts: PersistenceAlertQueryService;
}

type PersistenceAlertQueryService = (
  query: ESSearchRequest
) => Promise<Array<Record<string, unknown>>>;

export const createPersistenceRuleTypeFactory = ({
  logger,
  ruleDataClient,
}: {
  ruleDataClient: RuleDataClient;
  logger: Logger;
}) => <
  Params extends AlertTypeParams = never,
  State extends AlertTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never,
  RecoveryActionGroupId extends string = never
>(
  type: AlertTypeWithExecutor<
    Params,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId,
    ExecutorTypeWithExtraServices<
      Params,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      PersistenceAlertServices<InstanceContext>
    >
  >
): AlertType<
  Params,
  any,
  InstanceState,
  InstanceContext,
  ActionGroupIds,
  RecoveryActionGroupId
> => {
  return {
    ...type,
    executor: async (options) => {
      const {
        services: { alertInstanceFactory, scopedClusterClient },
      } = options;

      const currentAlerts: Array<Record<string, unknown>> = [];
      const timestamp = options.startedAt.toISOString();

      const state = await type.executor({
        ...options,
        services: {
          ...options.services,
          alertWithPersistence: (alerts) => {
            alerts.forEach((alert) => currentAlerts.push(alert));
            return alerts.map((alert) =>
              alertInstanceFactory(alert['kibana.rac.alert.uuid']! as string)
            );
          },
          findAlerts: async (query) => {
            const { body } = await scopedClusterClient.asCurrentUser.search({
              ...query,
              body: {
                ...query.body,
              },
              ignore_unavailable: true,
            });
            return body.hits.hits
              .map((event: { _source?: any }) => event._source!)
              .map((event: { [x: string]: any }) => {
                const alertUuid = event['kibana.rac.alert.uuid'];
                const isAlert = alertUuid != null;
                return {
                  ...event,
                  'event.kind': 'signal',
                  'kibana.rac.alert.id': '???',
                  'kibana.rac.alert.status': 'open',
                  'kibana.rac.alert.uuid': v4(),
                  'kibana.rac.alert.ancestors': isAlert
                    ? ((event['kibana.rac.alert.ancestors'] as string[]) ?? []).concat([
                        alertUuid!,
                      ] as string[])
                    : [],
                  'kibana.rac.alert.depth': isAlert
                    ? ((event['kibana.rac.alert.depth'] as number) ?? 0) + 1
                    : 0,
                  '@timestamp': timestamp,
                };
              });
          },
        },
      });

      const numAlerts = currentAlerts.length;
      logger.debug(`Found ${numAlerts} alerts.`);

      if (ruleDataClient && numAlerts) {
        await ruleDataClient.getWriter().bulk({
          body: currentAlerts.flatMap((event) => [{ index: {} }, event]),
        });
      }

      return state;
    },
  };
};
