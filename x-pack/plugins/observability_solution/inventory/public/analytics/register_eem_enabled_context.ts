/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup } from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import { EntityManagerPublicPluginSetup } from '@kbn/entityManager-plugin/public';

export let eemEnabled$: BehaviorSubject<{ ['eem_enabled']: boolean }>;

export function registerEemEnabledContext(
  analytics: AnalyticsServiceSetup,
  entityManager: EntityManagerPublicPluginSetup
) {
  entityManager.entityClient.isManagedEntityDiscoveryEnabled().then(({ enabled }) => {
    eemEnabled$ = new BehaviorSubject({
      ['eem_enabled']: enabled,
    });

    analytics.registerContextProvider({
      name: 'eem_enabled',
      context$: eemEnabled$,
      schema: {
        ['eem_enabled']: {
          type: 'boolean',
          _meta: { description: 'Whether EEM is enabled or not.' },
        },
      },
    });
  });
}
