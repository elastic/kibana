/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  search: schema.object({
    sessions: schema.object({
      /**
       * Turns the feature on \ off (incl. removing indicator and management screens)
       */
      enabled: schema.boolean({ defaultValue: true }),
      /**
       * pageSize controls how many search session objects we load at once while monitoring
       * session completion
       */
      pageSize: schema.number({ defaultValue: 10000 }),
      /**
       * trackingInterval controls how often we track search session objects progress
       */
      trackingInterval: schema.duration({ defaultValue: '10s' }),
      /**
       * notTouchedTimeout controls how long do we store unpersisted search session results,
       * after the last search in the session has completed
       */
      notTouchedTimeout: schema.duration({ defaultValue: '5m' }),
      /**
       * notTouchedInProgressTimeout controls how long do allow a search session to run after
       * a user has navigated away without persisting
       */
      notTouchedInProgressTimeout: schema.duration({ defaultValue: '1m' }),
      /**
       * maxUpdateRetries controls how many retries we perform while attempting to save a search session
       */
      maxUpdateRetries: schema.number({ defaultValue: 3 }),
      /**
       * defaultExpiration controls how long search sessions are valid for, until they are expired.
       */
      defaultExpiration: schema.duration({ defaultValue: '7d' }),
      management: schema.object({
        /**
         * maxSessions controls how many saved search sessions we display per page on the management screen.
         */
        maxSessions: schema.number({ defaultValue: 10000 }),
        /**
         * refreshInterval controls how often we refresh the management screen.
         */
        refreshInterval: schema.duration({ defaultValue: '10s' }),
        /**
         * refreshTimeout controls how often we refresh the management screen.
         */
        refreshTimeout: schema.duration({ defaultValue: '1m' }),
        expiresSoonWarning: schema.duration({ defaultValue: '1d' }),
      }),
    }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
