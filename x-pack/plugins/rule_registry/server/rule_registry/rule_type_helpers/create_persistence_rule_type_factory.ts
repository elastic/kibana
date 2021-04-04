/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import v4 from 'uuid/v4';
import { AlertInstance } from '../../../../alerting/server';
import { ActionVariable, AlertInstanceState } from '../../../../alerting/common';
import { RuleParams, RuleType } from '../../types';
import { DefaultFieldMap, defaultFieldMap } from '../defaults/field_map';
import { OutputOfFieldMap } from '../field_map/runtime_type_from_fieldmap';
import { PrepopulatedRuleEventFields } from '../create_scoped_rule_registry_client/types';
import { RuleRegistry } from '..';

type UserDefinedAlertFields<TFieldMap extends DefaultFieldMap> = Omit<
  OutputOfFieldMap<TFieldMap>,
  | PrepopulatedRuleEventFields
  | 'kibana.rac.alert.id'
  | 'kibana.rac.alert.uuid'
  | 'kibana.rac.alert.ancestors'
  | 'kibana.rac.alert.depth'
  | '@timestamp'
>;

type PersistenceAlertService<
  TFieldMap extends DefaultFieldMap,
  TActionVariable extends ActionVariable
> = (
  alerts: Array<UserDefinedAlertFields<TFieldMap>>
) => Array<AlertInstance<AlertInstanceState, { [key in TActionVariable['name']]: any }, string>>;

type CreatePersistenceRuleType<TFieldMap extends DefaultFieldMap> = <
  TRuleParams extends RuleParams,
  TActionVariable extends ActionVariable
>(
  type: RuleType<
    TFieldMap,
    TRuleParams,
    TActionVariable,
    { alertWithPersistence: PersistenceAlertService<TFieldMap, TActionVariable> }
  >
) => RuleType<TFieldMap, TRuleParams, TActionVariable>;

export function createPersistenceRuleTypeFactory<
  TRuleRegistry extends RuleRegistry<DefaultFieldMap>
>(): TRuleRegistry extends RuleRegistry<infer TFieldMap>
  ? CreatePersistenceRuleType<TFieldMap>
  : never;

export function createPersistenceRuleTypeFactory(): CreatePersistenceRuleType<DefaultFieldMap> {
  return (type) => {
    return {
      ...type,
      executor: async (options) => {
        const {
          services: { scopedRuleRegistryClient, alertInstanceFactory, logger },
        } = options;

        const currentAlerts: Array<
          UserDefinedAlertFields<DefaultFieldMap> & {
            'kibana.rac.alert.id': string;
            'kibana.rac.alert.uuid': string;
            'kibana.rac.alert.ancestors': string[];
            'kibana.rac.alert.depth': number;
            '@timestamp': string;
          }
        > = [];

        const timestamp = options.startedAt.toISOString();

        const query = type.query!(options);

        const { events } = await scopedRuleRegistryClient!.search({
          ...query,
          body: {
            ...query.body,
            fields: Object.keys(defaultFieldMap),
            // fields: query.body?.fields ?? ['*'],
          },
        });

        // console.log('EVENTS');
        // console.log(JSON.stringify(events));
        events.forEach((event) => {
          const alertUuid = event['kibana.rac.alert.uuid'];
          const isAlert = alertUuid != null;

          currentAlerts.push({
            ...event,
            'kibana.rac.alert.id': '???',
            'kibana.rac.alert.uuid': v4(),
            'kibana.rac.alert.ancestors': isAlert
              ? (event['kibana.rac.alert.ancestors'] ?? []).concat([alertUuid!])
              : [],
            'kibana.rac.alert.depth': isAlert ? event['kibana.rac.alert.depth']! + 1 : 0,
            'event.kind': 'signal',
            '@timestamp': timestamp,
          });
        });

        const alertInstances = currentAlerts.map((alert) =>
          alertInstanceFactory(alert['kibana.rac.alert.uuid']!)
        );
        // TODO: schedule actions

        const numAlerts = Object.keys(currentAlerts).length;
        logger.debug(`Found ${numAlerts} alerts.`);

        if (scopedRuleRegistryClient && numAlerts) {
          await scopedRuleRegistryClient.bulkIndex(Object.values(currentAlerts));
        }

        return currentAlerts;
      },
    };
  };
}
