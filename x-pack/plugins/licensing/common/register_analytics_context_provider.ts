/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import type { AnalyticsClient } from '@kbn/analytics-client';
import type { ILicense } from './types';

export function registerAnalyticsContextProvider(
  // Using `AnalyticsClient` from the package to be able to implement this method in the `common` dir.
  analytics: Pick<AnalyticsClient, 'registerContextProvider'>,
  license$: Observable<ILicense>
) {
  analytics.registerContextProvider({
    name: 'license info',
    context$: license$.pipe(
      map((license) => ({
        license_id: license.uid,
        license_status: license.status,
        license_type: license.type,
      }))
    ),
    schema: {
      license_id: {
        type: 'keyword',
        _meta: { description: 'The license ID', optional: true },
      },
      license_status: {
        type: 'keyword',
        _meta: { description: 'The license Status (active/invalid/expired)', optional: true },
      },
      license_type: {
        type: 'keyword',
        _meta: {
          description: 'The license Type (basic/standard/gold/platinum/enterprise/trial)',
          optional: true,
        },
      },
    },
  });
}
