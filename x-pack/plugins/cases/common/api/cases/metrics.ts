/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export type MetricsResponse = rt.TypeOf<typeof MetricsResponseRt>;

export const MetricsResponseRt = rt.partial(
  rt.type({
    /**
     * Number of alerts attached to the case
     */
    alertsCount: rt.number,
    /**
     * External connectors associated with the case
     */
    connectors: rt.array(
      rt.type({
        id: rt.string,
        name: rt.string,
        pushCount: rt.string,
      })
    ),
    /**
     * Host information represented from the alerts attached to this case
     */
    alertHosts: rt.type({
      /**
       * Total unique hosts represented in the alerts
       */
      total: rt.number,
      values: rt.array(
        rt.type({
          /**
           * Host name
           */
          name: rt.string,
          /**
           * Number of alerts that have this particular host name
           */
          count: rt.number,
        })
      ),
    }),
    /**
     * User information represented from the alerts attached to this case
     */
    alertUsers: rt.type({
      /**
       * Total unique users represented in the alerts
       */
      total: rt.number,
      values: rt.array(
        rt.type({
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
    }),
    /**
     * The case's open,close,in-progress details
     */
    lifespan: rt.type({
      /**
       * Date the case was created, in ISO format
       */
      creationDate: rt.string,
      /**
       * Date the case was closed, in ISO format. Will be null if the case is not currently closed
       */
      closeDate: rt.union([rt.string, rt.null]),
    }),
  }).props
);
