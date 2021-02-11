/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVENT_LOG_ACTIONS } from '../plugin';
import { SanitizedAlert, AlertInstanceSummary, AlertInstanceStatus } from '../types';

const MAX_BUCKETS_LIMIT = 65535;

export interface AlertsInstanceSummaryFromEventLogParams {
  alerts: Array<SanitizedAlert<{ bar: boolean }>>;
  instancesLatestStateSummaries: Array<{
    savedObjectId: string;
    summary: RawEventLogAlertsSummary;
  }>;
  instancesCreatedSummaries: Array<{
    savedObjectId: string;
    summary: Pick<RawEventLogAlertsSummary, 'instances'>;
  }>;
  dateStart: string;
  dateEnd: string;
}

export function alertsInstanceSummaryFromEventLog(
  params: AlertsInstanceSummaryFromEventLogParams
): AlertInstanceSummary[] {
  // initialize the  result
  const {
    alerts,
    instancesLatestStateSummaries,
    instancesCreatedSummaries,
    dateStart,
    dateEnd,
  } = params;
  return alerts.map((alert) => {
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
    const instancesLatestStateSummary = instancesLatestStateSummaries.find(
      (alertSummary) => alertSummary.savedObjectId === alert.id
    )?.summary;

    const instancesCreatedSummary = (instancesCreatedSummaries ?? []).find(
      (alertSummary) => alertSummary.savedObjectId === alert.id
    )?.summary;
    if (
      instancesLatestStateSummary &&
      instancesLatestStateSummary.instances &&
      instancesLatestStateSummary.instances.buckets
    ) {
      for (const instance of instancesLatestStateSummary.instances.buckets) {
        const instanceId = instance.key;
        const status = getAlertInstanceStatus(instances, instanceId);
        const instanceCreated = instancesCreatedSummary?.instances?.buckets?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (newInstance: any) => newInstance.key === instanceId
        );
        status.activeStartDate = instanceCreated?.instance_created?.max_timestamp?.value_as_string;

        const actionActivityResult = instance.last_state?.action?.hits?.hits;
        if (actionActivityResult && actionActivityResult.length > 0) {
          const actionData = actionActivityResult[0]._source;
          if (
            actionData.event.action === EVENT_LOG_ACTIONS.activeInstance ||
            actionData.event.action === EVENT_LOG_ACTIONS.newInstance
          ) {
            status.status = 'Active';
            status.actionGroupId = actionData.kibana?.alerting?.action_group_id;
            status.actionSubgroup = actionData.kibana?.alerting?.action_subgroup;
          }
        }
      }
    }

    alertInstanceSummary.lastRun =
      instancesLatestStateSummary?.last_execution_state?.max_timestamp?.value_as_string;

    const executionErrors = instancesLatestStateSummary?.errors_state?.action?.hits?.hits;

    if (executionErrors && executionErrors.length > 0) {
      alertInstanceSummary.status = 'Error';
      alertInstanceSummary.errorMessages.push(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...executionErrors.map((executionError: any) => ({
          date: executionError._source['@timestamp'],
          message: executionError._source.error.message,
        }))
      );
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
  });
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
      last_active_state: {
        filter: {
          term: { 'event.action': 'active-instance' },
        },
        aggs: {
          max_timestamp: { max: { field: '@timestamp' } },
        },
      },
      last_new_state: {
        filter: {
          term: { 'event.action': 'new-instance' },
        },
        aggs: {
          max_timestamp: { max: { field: '@timestamp' } },
        },
      },
      last_recovered_state: {
        filter: {
          term: { 'event.action': 'new-instance' },
        },
        aggs: {
          max_timestamp: { max: { field: '@timestamp' } },
        },
      },
      last_action_group_id: {
        filter: {
          exists: { field: 'kibana.alerting.action_group_id' },
        },
        aggs: {
          action_group_id: {
            top_metrics: {
              metrics: { field: 'kibana.alerting.action_group_id' },
              sort: { '@timestamp': 'desc' },
              size: 1,
            },
          },
        },
      },
      last_action_subgroup: {
        filter: {
          exists: { field: 'kibana.alerting.action_subgroup' },
        },
        aggs: {
          action_subgroup: {
            top_metrics: {
              metrics: { field: 'kibana.alerting.action_subgroup' },
              sort: { '@timestamp': 'desc' },
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
        top_metrics: {
          metrics: { field: 'error.message' },
          sort: { '@timestamp': 'desc' },
          size: 1,
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
