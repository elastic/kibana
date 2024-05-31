/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { takeUntil, map } from 'rxjs';
import { type ServiceStatus, ServiceStatusLevels } from '@kbn/core/server';
import type { ILicense } from '../common/types';

export const getPluginStatus$ = (
  license$: Observable<ILicense>,
  stop$: Observable<void>
): Observable<ServiceStatus> => {
  return license$.pipe(
    takeUntil(stop$),
    map((license) => {
      if (license) {
        if (license.error) {
          return {
            level: ServiceStatusLevels.unavailable,
            summary: 'Error fetching license',
          };
        }
        return {
          level: ServiceStatusLevels.available,
          summary: 'License fetched',
        };
      }
      return {
        level: ServiceStatusLevels.degraded,
        summary: 'License not fetched yet',
      };
    })
  );
};
