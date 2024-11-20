/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export type SingleCaseMetricsRequest = rt.TypeOf<typeof SingleCaseMetricsRequestRt>;
export type SingleCaseMetricsResponse = rt.TypeOf<typeof SingleCaseMetricsResponseRt>;
export type CasesMetricsRequest = rt.TypeOf<typeof CasesMetricsRequestRt>;
export type CasesMetricsResponse = rt.TypeOf<typeof CasesMetricsResponseRt>;
export type AlertHostsMetrics = rt.TypeOf<typeof AlertHostsMetricsRt>;
export type AlertUsersMetrics = rt.TypeOf<typeof AlertUsersMetricsRt>;
export type StatusInfo = rt.TypeOf<typeof StatusInfoRt>;

export enum CaseMetricsFeature {
  ALERTS_COUNT = 'alerts.count',
  ALERTS_USERS = 'alerts.users',
  ALERTS_HOSTS = 'alerts.hosts',
  ACTIONS_ISOLATE_HOST = 'actions.isolateHost',
  CONNECTORS = 'connectors',
  LIFESPAN = 'lifespan',
  MTTR = 'mttr',
  STATUS = 'status',
}

export const SingleCaseMetricsFeatureFieldRt = rt.union([
  rt.literal(CaseMetricsFeature.ALERTS_COUNT),
  rt.literal(CaseMetricsFeature.ALERTS_USERS),
  rt.literal(CaseMetricsFeature.ALERTS_HOSTS),
  rt.literal(CaseMetricsFeature.ACTIONS_ISOLATE_HOST),
  rt.literal(CaseMetricsFeature.CONNECTORS),
  rt.literal(CaseMetricsFeature.LIFESPAN),
]);

export const CasesMetricsFeatureFieldRt = rt.union([
  SingleCaseMetricsFeatureFieldRt,
  rt.literal(CaseMetricsFeature.MTTR),
  rt.literal(CaseMetricsFeature.STATUS),
]);

const StatusInfoRt = rt.strict({
  /**
   * Duration the case was in the open status in milliseconds
   */
  openDuration: rt.number,
  /**
   * Duration the case was in the in-progress status in milliseconds. Zero indicates the case was never in-progress.
   */
  inProgressDuration: rt.number,
  /**
   * The ISO string representation of the dates the case was reopened
   */
  reopenDates: rt.array(rt.string),
});

const AlertHostsMetricsRt = rt.strict({
  /**
   * Total unique hosts represented in the alerts
   */
  total: rt.number,
  values: rt.array(
    rt.strict({
      /**
       * Host name
       */
      name: rt.union([rt.string, rt.undefined]),
      /**
       * Unique identifier for the host
       */
      id: rt.string,
      /**
       * Number of alerts that have this particular host name
       */
      count: rt.number,
    })
  ),
});

const AlertUsersMetricsRt = rt.strict({
  /**
   * Total unique users represented in the alerts
   */
  total: rt.number,
  values: rt.array(
    rt.strict({
      /**
       * Username
       */
      name: rt.string,
      /**
       * Number of alerts that have this particular username
       */
      count: rt.number,
    })
  ),
});

export const SingleCaseMetricsRequestRt = rt.strict({
  /**
   * The metrics to retrieve.
   */
  features: rt.array(SingleCaseMetricsFeatureFieldRt),
});

export const CasesMetricsRequestRt = rt.intersection([
  rt.strict({
    /**
     * The metrics to retrieve.
     */
    features: rt.array(CasesMetricsFeatureFieldRt),
  }),
  rt.exact(
    rt.partial({
      /**
       * A KQL date. If used all cases created after (gte) the from date will be returned
       */
      from: rt.string,
      /**
       * A KQL date. If used all cases created before (lte) the to date will be returned.
       */
      to: rt.string,
      /**
       * The owner(s) to filter by. The user making the request must have privileges to retrieve cases of that
       * ownership or they will be ignored. If no owner is included, then all ownership types will be included in the response
       * that the user has access to.
       */
      owner: rt.union([rt.array(rt.string), rt.string]),
    })
  ),
]);

export const SingleCaseMetricsResponseRt = rt.exact(
  rt.partial({
    alerts: rt.exact(
      rt.partial({
        /**
         * Number of alerts attached to the case
         */
        count: rt.number,
        /**
         * Host information represented from the alerts attached to this case
         */
        hosts: AlertHostsMetricsRt,
        /**
         * User information represented from the alerts attached to this case
         */
        users: AlertUsersMetricsRt,
      })
    ),
    /**
     * External connectors associated with the case
     */
    connectors: rt.strict({
      /**
       * Total number of connectors in the case
       */
      total: rt.number,
    }),
    /**
     * Actions taken within the case
     */
    actions: rt.exact(
      rt.partial({
        isolateHost: rt.strict({
          /**
           * Isolate host action information
           */
          isolate: rt.strict({
            /**
             * Total times the isolate host action has been performed
             */
            total: rt.number,
          }),
          /**
           * Unisolate host action information
           */
          unisolate: rt.strict({
            /**
             * Total times the unisolate host action has been performed
             */
            total: rt.number,
          }),
        }),
      })
    ),
    /**
     * The case's open,close,in-progress details
     */
    lifespan: rt.strict({
      /**
       * Date the case was created, in ISO format
       */
      creationDate: rt.string,
      /**
       * Date the case was closed, in ISO format. Will be null if the case is not currently closed
       */
      closeDate: rt.union([rt.string, rt.null]),
      /**
       * The case's status information regarding durations in a specific status
       */
      statusInfo: StatusInfoRt,
    }),
  })
);

export const CasesMetricsResponseRt = rt.exact(
  rt.partial({
    /**
     * The average resolve time of all cases in seconds
     */
    mttr: rt.union([rt.number, rt.null]),
    /**
     * The number of total cases per status
     */
    status: rt.strict({ open: rt.number, inProgress: rt.number, closed: rt.number }),
  })
);

export type CasesMetricsFeatureField = rt.TypeOf<typeof CasesMetricsFeatureFieldRt>;
export type SingleCaseMetricsFeatureField = rt.TypeOf<typeof SingleCaseMetricsFeatureFieldRt>;
