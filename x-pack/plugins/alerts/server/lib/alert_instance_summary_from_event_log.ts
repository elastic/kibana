/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVENT_LOG_ACTIONS } from '../plugin';
import { SanitizedAlert, AlertInstanceSummary, AlertInstanceStatus } from '../types';

const MAX_BUCKETS_LIMIT = 65535;

export interface AlertInstanceSummaryFromEventLogParams {
  alert: SanitizedAlert<{ bar: boolean }>;
  instancesLatestStateSummary: RawEventLogAlertsSummary;
  instancesCreatedSummary: Pick<RawEventLogAlertsSummary, 'instances'>;
  dateStart: string;
  dateEnd: string;
}

export function alertInstanceSummaryFromEventLog(
  params: AlertInstanceSummaryFromEventLogParams
): AlertInstanceSummary {
  // initialize the  result
  const {
    alert,
    instancesLatestStateSummary,
    instancesCreatedSummary,
    dateStart,
    dateEnd,
  } = params;
  const alertInstanceSummary: AlertInstanceSummary = {
    id: alert.id,
    name: alert.name,
    tags: alert.tags,
    alertTypeId: alert.alertTypeId,
    consumer: alert.consumer,
    statusStartDate: dateStart,
    statusEndDate: dateEnd,
    status: 'OK',
    muteAll: alert.muteAll,
    throttle: alert.throttle,
    enabled: alert.enabled,
    lastRun: undefined,
    errorMessages: [],
    instances: {},
  };

  const instances = new Map<string, AlertInstanceStatus>();

  if (instancesLatestStateSummary.instances && instancesLatestStateSummary.instances.buckets) {
    for (const instance of instancesLatestStateSummary.instances.buckets) {
      const instanceId = instance.key;
      const status = getAlertInstanceStatus(instances, instanceId);
      if (instancesCreatedSummary.instances) {
        const instanceCreated = instancesCreatedSummary.instances.buckets.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (newInstance: any) => newInstance.key === instanceId
        );
        status.activeStartDate = instanceCreated
          ? instanceCreated.instance_created.max_timestamp.value_as_string
          : undefined;
      }

      const actionActivityResult = instance.last_state.action.hits.hits;
      if (actionActivityResult.length > 0) {
        const actionData = actionActivityResult[0]._source;
        if (
          actionData.event.action === EVENT_LOG_ACTIONS.activeInstance ||
          actionData.event.action === EVENT_LOG_ACTIONS.newInstance
        ) {
          status.status = 'Active';
          status.actionGroupId = actionData.kibana.alerting.action_group_id;
          status.actionSubgroup = actionData.kibana.alerting.action_subgroup;
        }
      }
    }
  }

  if (instancesLatestStateSummary.last_execution_state) {
    alertInstanceSummary.lastRun =
      instancesLatestStateSummary.last_execution_state.max_timestamp?.value_as_string;
  }

  if (
    instancesLatestStateSummary.errors_state &&
    instancesLatestStateSummary.errors_state.action &&
    instancesLatestStateSummary.errors_state.action.hits.hits.length > 0
  ) {
    const executionSummary = instancesLatestStateSummary.errors_state.action.hits.hits[0]._source;

    if (executionSummary.error !== undefined) {
      alertInstanceSummary.status = 'Error';
      alertInstanceSummary.errorMessages.push({
        date: executionSummary['@timestamp'],
        message: executionSummary.error.message,
      });
    }
  }
  // set the muted status of instances
  for (const instanceId of alert.mutedInstanceIds) {
    getAlertInstanceStatus(instances, instanceId).muted = true;
  }

  // convert the instances map to object form
  const instanceIds = Array.from(instances.keys()).sort();
  for (const instanceId of instanceIds) {
    alertInstanceSummary.instances[instanceId] = instances.get(instanceId)!;
  }

  // set the overall alert status to Active if appropriate
  if (alertInstanceSummary.status !== 'Error') {
    if (Array.from(instances.values()).some((instance) => instance.status === 'Active')) {
      alertInstanceSummary.status = 'Active';
    }
  }

  alertInstanceSummary.errorMessages.sort((a, b) => a.date.localeCompare(b.date));

  return alertInstanceSummary;
}

export interface RawEventLogAlertsSummary {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instances: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  last_execution_state: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors_state: Record<string, any>;
}

export const alertActiveAndResolvedInstancesSummaryQueryAggregation = {
  instances: {
    // reason: '[composite] aggregation cannot be used with a parent aggregation of type: [ReverseNestedAggregatorFactory]'
    terms: {
      field: 'kibana.alerting.instance_id',
      order: { _key: 'asc' },
      size: MAX_BUCKETS_LIMIT,
    },
    aggs: {
      last_state: {
        filter: {
          bool: {
            should: [
              { term: { 'event.action': 'active-instance' } },
              { term: { 'event.action': 'new-instance' } },
              { term: { 'event.action': 'recovered-instance' } },
            ],
          },
        },
        aggs: {
          action: {
            top_hits: {
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
              _source: {
                includes: [
                  '@timestamp',
                  'event.action',
                  'kibana.alerting.action_group_id',
                  'kibana.alerting.action_subgroup',
                ],
              },
              size: 1,
            },
          },
        },
      },
    },
  },
  errors_state: {
    filter: {
      bool: {
        must: [{ term: { 'event.action': 'execute' } }, { exists: { field: 'error.message' } }],
      },
    },
    aggs: {
      action: {
        top_hits: {
          sort: [
            {
              '@timestamp': {
                order: 'desc',
              },
            },
          ],
          _source: {
            includes: ['@timestamp', 'error.message'],
          },
        },
      },
    },
  },
  last_execution_state: {
    filter: {
      term: { 'event.action': 'execute' },
    },
    aggs: {
      max_timestamp: { max: { field: '@timestamp' } },
    },
  },
};

export const alertInstanceCreatedQueryAggregation = {
  instances: {
    // reason: '[composite] aggregation cannot be used with a parent aggregation of type: [ReverseNestedAggregatorFactory]'
    terms: {
      field: 'kibana.alerting.instance_id',
      order: { _key: 'asc' },
      size: MAX_BUCKETS_LIMIT,
    },
    aggs: {
      instance_created: {
        filter: {
          term: { 'event.action': 'new-instance' },
        },
        aggs: {
          max_timestamp: { max: { field: '@timestamp' } },
        },
      },
    },
  },
};

// return an instance status object, creating and adding to the map if needed
function getAlertInstanceStatus(
  instances: Map<string, AlertInstanceStatus>,
  instanceId: string
): AlertInstanceStatus {
  if (instances.has(instanceId)) return instances.get(instanceId)!;

  const status: AlertInstanceStatus = {
    status: 'OK',
    muted: false,
    actionGroupId: undefined,
    actionSubgroup: undefined,
    activeStartDate: undefined,
  };
  instances.set(instanceId, status);
  return status;
}
