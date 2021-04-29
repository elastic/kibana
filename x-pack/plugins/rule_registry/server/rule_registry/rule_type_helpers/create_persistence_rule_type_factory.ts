/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ESSearchRequest } from 'typings/elasticsearch';
import v4 from 'uuid/v4';

import { AlertInstance } from '../../../../alerting/server';
import { ActionVariable, AlertInstanceState } from '../../../../alerting/common';
import { baseRuleFieldMap, BaseRuleFieldMap, OutputOfFieldMap } from '../../../common';
import { RuleParams, RuleType } from '../../types';
import { RuleRegistry } from '..';

type PersistenceAlertPersistenceService<
  TFieldMap extends BaseRuleFieldMap,
  TActionVariable extends ActionVariable
> = (
  alerts: Array<OutputOfFieldMap<TFieldMap>>
) => Array<AlertInstance<AlertInstanceState, { [key in TActionVariable['name']]: any }, string>>;

type PersistenceAlertQueryService<TFieldMap extends BaseRuleFieldMap> = (
  query: ESSearchRequest
) => Promise<Array<OutputOfFieldMap<TFieldMap>>>;

type CreatePersistenceRuleType<TFieldMap extends BaseRuleFieldMap> = <
  TRuleParams extends RuleParams,
  TActionVariable extends ActionVariable
>(
  type: RuleType<
    TFieldMap,
    TRuleParams,
    TActionVariable,
    {
      alertWithPersistence: PersistenceAlertPersistenceService<TFieldMap, TActionVariable>;
      findAlerts: PersistenceAlertQueryService<TFieldMap>;
    }
  >
) => RuleType<TFieldMap, TRuleParams, TActionVariable>;

export function createPersistenceRuleTypeFactory<
  TRuleRegistry extends RuleRegistry<BaseRuleFieldMap>
>(): TRuleRegistry extends RuleRegistry<infer TFieldMap>
  ? CreatePersistenceRuleType<TFieldMap>
  : never;

export function createPersistenceRuleTypeFactory(): CreatePersistenceRuleType<BaseRuleFieldMap> {
  return (type) => {
    return {
      ...type,
      executor: async (options) => {
        const {
          services: { scopedClusterClient, scopedRuleRegistryClient, alertInstanceFactory, logger },
        } = options;

        const currentAlerts: Array<OutputOfFieldMap<BaseRuleFieldMap>> = [];
        const timestamp = options.startedAt.toISOString();

        const state = await type.executor({
          ...options,
          services: {
            ...options.services,
            alertWithPersistence: (alerts) => {
              alerts.forEach((alert) => currentAlerts.push(alert));
              return alerts.map((alert) => alertInstanceFactory(alert['kibana.rac.alert.uuid']!));
            },
            findAlerts: async (query) => {
              const { body } = await scopedClusterClient.asCurrentUser.search<
                OutputOfFieldMap<BaseRuleFieldMap>
              >({
                ...query,
                body: {
                  ...query.body,
                  _source: Object.keys(baseRuleFieldMap),
                },
                ignore_unavailable: true,
              });
              return body.hits.hits
                .map((event) => event._source!)
                .map((event) => {
                  const alertUuid = event['kibana.rac.alert.uuid'];
                  const isAlert = alertUuid != null;
                  return {
                    ...event,
                    'event.kind': 'signal',
                    'kibana.rac.alert.id': '???',
                    'kibana.rac.alert.uuid': v4(),
                    'kibana.rac.alert.ancestors': isAlert
                      ? (event['kibana.rac.alert.ancestors'] ?? []).concat([alertUuid!])
                      : [],
                    'kibana.rac.alert.depth': isAlert
                      ? (event['kibana.rac.alert.depth'] ?? 0) + 1
                      : 0,
                    '@timestamp': timestamp,
                  };
                });
            },
          },
        });

        const numAlerts = currentAlerts.length;
        logger.debug(`Found ${numAlerts} alerts.`);

        if (scopedRuleRegistryClient && numAlerts) {
          await scopedRuleRegistryClient.bulkIndex(currentAlerts);
        }

        return state;
      },
    };
  };
}
