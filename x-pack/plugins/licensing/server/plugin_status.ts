/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { takeUntil, startWith, map } from 'rxjs/operators';
import { ServiceStatus, ServiceStatusLevels } from '@kbn/core/server';
import { ILicense } from '../common/types';

export const getPluginStatus$ = (
  license$: Observable<ILicense>,
  stop$: Observable<void>
): Observable<ServiceStatus> => {
  return license$.pipe(
    startWith(undefined),
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
