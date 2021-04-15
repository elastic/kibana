/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import v4 from 'uuid/v4';
import { Logger } from 'src/core/server';
import { DefaultFieldMap } from '../../defaults/field_map';
import { OutputOfFieldMap } from '../../field_map/runtime_type_from_fieldmap';
import {
  PrepopulatedRuleEventFields,
  ScopedRuleRegistryClient,
} from '../../create_scoped_rule_registry_client/types';

export type UserDefinedAlertFields<TFieldMap extends DefaultFieldMap> = Omit<
  OutputOfFieldMap<TFieldMap>,
  PrepopulatedRuleEventFields | 'kibana.rac.alert.id' | 'kibana.rac.alert.uuid' | '@timestamp'
>;

const defaultLifecycleEventMap = {
  'event.kind': 'state',
  new: {
    'event.action': 'open',
  },
  recovered: {
    'event.action': 'close',
    'kibana.rac.alert.status': 'closed',
  },
  active: {
    'event.action': 'active',
    'kibana.rac.alert.status': 'open',
  },
};

export type LifecycleEventMap = typeof defaultLifecycleEventMap;

async function rehydrateRecoveredAlerts({
  ruleUuid,
  recoveredAlerts,
  scopedRuleRegistryClient,
}: {
  ruleUuid: string;
  recoveredAlerts: Array<{
    alertId: string;
    alertUuid: string;
    started: string;
  }>;
  scopedRuleRegistryClient?: ScopedRuleRegistryClient<DefaultFieldMap>;
}): Promise<Record<string, UserDefinedAlertFields<DefaultFieldMap>>> {
  const recoveredAlertsDataMap: Record<string, UserDefinedAlertFields<DefaultFieldMap>> = {};

  // if there are "recovered" alerts, query for the last active state of this alert grouping
  if (scopedRuleRegistryClient && recoveredAlerts && recoveredAlerts.length) {
    const { events: lastActiveEvents } = await scopedRuleRegistryClient.search({
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  'rule.uuid': ruleUuid,
                },
              },
              {
                terms: {
                  'kibana.rac.alert.uuid': recoveredAlerts.map(
                    (recoveredAlert) => recoveredAlert.alertUuid
                  ),
                },
              },
            ],
          },
        },
        size: recoveredAlerts.length,
        collapse: {
          field: 'kibana.rac.alert.uuid',
        },
        _source: false,
        fields: ['*'],
        sort: {
          '@timestamp': 'desc' as const,
        },
      },
    });

    lastActiveEvents.forEach((event) => {
      const alertId = event['kibana.rac.alert.id']!;
      recoveredAlertsDataMap[alertId] = event;
    });
  }

  return recoveredAlertsDataMap;
}

export async function generateEventsFromAlerts({
  logger,
  ruleUuid,
  startedAt,
  scopedRuleRegistryClient,
  currentAlerts,
  trackedAlerts,
  lifecycleEventMap,
}: {
  logger: Logger;
  ruleUuid: string;
  startedAt: Date;
  scopedRuleRegistryClient?: ScopedRuleRegistryClient<DefaultFieldMap>;
  currentAlerts: Record<
    string,
    UserDefinedAlertFields<DefaultFieldMap> & { 'kibana.rac.alert.id': string }
  >;
  trackedAlerts: Record<
    string,
    {
      alertId: string;
      alertUuid: string;
      started: string;
    }
  >;
  lifecycleEventMap?: LifecycleEventMap;
}): Promise<{
  eventsToIndex: Array<OutputOfFieldMap<DefaultFieldMap>>;
  alertsToTrack: Record<
    string,
    {
      alertId: string;
      alertUuid: string;
      started: string;
    }
  >;
}> {
  const lifecycleEventMapToUse = lifecycleEventMap
    ? { ...defaultLifecycleEventMap, ...lifecycleEventMap }
    : defaultLifecycleEventMap;

  // alerts from current rule execution cycle
  const currentAlertIds = Object.keys(currentAlerts);

  // alerts from previous rule execution cycle
  const trackedAlertIds = Object.keys(trackedAlerts);

  // alerts from current rule execution cycle that did not exist in previous rule execution cycle
  const newAlertIds = currentAlertIds.filter((alertId) => !trackedAlertIds.includes(alertId));

  // alerts from current and previous rule execution cycles
  const allAlertIds = [...new Set(currentAlertIds.concat(trackedAlertIds))];

  // determine "recovered" alerts (alerts from previous rule execution cycle that are not alerts in current rule execution cycle)
  const recoveredAlerts = Object.values(trackedAlerts).filter(
    (trackedAlertState) => !currentAlerts[trackedAlertState.alertId]
  );

  logger.info(
    `Tracking ${allAlertIds.length} alerts (${newAlertIds.length} new, ${recoveredAlerts.length} recovered)`
  );

  const alertsDataMap: Record<string, UserDefinedAlertFields<DefaultFieldMap>> = {
    ...currentAlerts,
    ...(await rehydrateRecoveredAlerts({ ruleUuid, recoveredAlerts, scopedRuleRegistryClient })),
  };

  const eventsToIndex: Array<OutputOfFieldMap<DefaultFieldMap>> = allAlertIds.map((alertId) => {
    const alertData = alertsDataMap[alertId];

    if (!alertData) {
      logger.warn(`Could not find alert data for ${alertId}`);
    }

    const event: OutputOfFieldMap<DefaultFieldMap> = {
      ...alertData,
      '@timestamp': startedAt.toISOString(),
      'event.kind': lifecycleEventMapToUse['event.kind'],
      'kibana.rac.alert.id': alertId,
    };

    const isNew = !trackedAlerts[alertId];
    const isRecovered = !currentAlerts[alertId];
    const isActiveButNotNew = !isNew && !isRecovered;
    const isActive = !isRecovered;

    const { alertUuid, started } = trackedAlerts[alertId] ?? {
      alertUuid: v4(),
      started: startedAt.toISOString(),
    };

    event['kibana.rac.alert.start'] = started;
    event['kibana.rac.alert.uuid'] = alertUuid;

    if (isNew) {
      event['event.action'] = lifecycleEventMapToUse.new['event.action'];
    }

    if (isRecovered) {
      event['kibana.rac.alert.end'] = startedAt.toISOString();
      event['event.action'] = lifecycleEventMapToUse.recovered['event.action'];
      event['kibana.rac.alert.status'] =
        lifecycleEventMapToUse.recovered['kibana.rac.alert.status'];
    }

    if (isActiveButNotNew) {
      event['event.action'] = lifecycleEventMapToUse.active['event.action'];
    }

    if (isActive) {
      event['kibana.rac.alert.status'] = lifecycleEventMapToUse.active['kibana.rac.alert.status'];
    }

    event['kibana.rac.alert.duration.us'] =
      (startedAt.getTime() - new Date(event['kibana.rac.alert.start']!).getTime()) * 1000;

    return event;
  });

  const alertsToTrack = Object.fromEntries(
    eventsToIndex
      .filter(
        (event) =>
          event['kibana.rac.alert.status'] !==
          lifecycleEventMapToUse.recovered['kibana.rac.alert.status']
      )
      .map((event) => {
        const alertId = event['kibana.rac.alert.id']!;
        const alertUuid = event['kibana.rac.alert.uuid']!;
        const started = new Date(event['kibana.rac.alert.start']!).toISOString();
        return [alertId, { alertId, alertUuid, started }];
      })
  );

  return { eventsToIndex, alertsToTrack };
}
