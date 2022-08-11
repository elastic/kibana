/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, ObservableInput, Subscription } from 'rxjs';
import { BehaviorSubject, combineLatest, concat, defer, of, timer } from 'rxjs';
import { catchError, mergeMap, switchMap, tap } from 'rxjs/operators';

import type { CoreSetup, Logger, SavedObjectsServiceStart, ServiceStatus } from '@kbn/core/server';
import { ServiceStatusLevels } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-plugin/server';

import type { SpacesLicense } from '../../common/licensing';
import { createDefaultSpace } from './create_default_space';

interface Deps {
  coreStatus: CoreSetup['status'];
  getSavedObjects: () => Promise<Pick<SavedObjectsServiceStart, 'createInternalRepository'>>;
  license$: Observable<ILicense>;
  spacesLicense: SpacesLicense;
  logger: Logger;
}

export const RETRY_SCALE_DURATION = 100;
export const RETRY_DURATION_MAX = 10000;

const calculateDuration = (i: number) => {
  const duration = i * RETRY_SCALE_DURATION;
  if (duration > RETRY_DURATION_MAX) {
    return RETRY_DURATION_MAX;
  }

  return duration;
};

// we can't use a retryWhen here, because we want to propagate the unavailable status and then retry
const propagateUnavailableStatusAndScaleRetry = () => {
  let i = 0;
  return (err: Error, caught: ObservableInput<any>) =>
    concat(
      of({
        level: ServiceStatusLevels.unavailable,
        summary: `Error creating default space: ${err.message}`,
      }),
      timer(calculateDuration(++i)).pipe(mergeMap(() => caught))
    );
};

export class DefaultSpaceService {
  private initializeSubscription?: Subscription;

  private serviceStatus$?: BehaviorSubject<ServiceStatus>;

  public setup({ coreStatus, getSavedObjects, license$, spacesLicense, logger }: Deps) {
    const statusLogger = logger.get('status');

    this.serviceStatus$ = new BehaviorSubject({
      level: ServiceStatusLevels.unavailable,
      summary: 'not initialized',
    } as ServiceStatus);

    this.initializeSubscription = combineLatest([coreStatus.core$, license$])
      .pipe(
        switchMap(([status]) => {
          const isElasticsearchReady = status.elasticsearch.level === ServiceStatusLevels.available;
          const isSavedObjectsReady = status.savedObjects.level === ServiceStatusLevels.available;

          if (!isElasticsearchReady || !isSavedObjectsReady) {
            return of({
              level: ServiceStatusLevels.unavailable,
              summary: 'required core services are not ready',
            } as ServiceStatus);
          }

          if (!spacesLicense.isEnabled()) {
            return of({
              level: ServiceStatusLevels.unavailable,
              summary: 'missing or invalid license',
            } as ServiceStatus);
          }

          return defer(() =>
            createDefaultSpace({
              getSavedObjects,
              logger,
            }).then(() => {
              return {
                level: ServiceStatusLevels.available,
                summary: 'ready',
              };
            })
          ).pipe(catchError(propagateUnavailableStatusAndScaleRetry()));
        }),
        tap<ServiceStatus>((spacesStatus) => {
          // This is temporary for debugging/visibility until we get a proper status service from core.
          // See issue #41983 for details.
          statusLogger.debug(`${spacesStatus.level.toString()}: ${spacesStatus.summary}`);
          this.serviceStatus$!.next(spacesStatus);
        })
      )
      .subscribe();

    return {
      serviceStatus$: this.serviceStatus$!.asObservable(),
    };
  }

  public stop() {
    if (this.initializeSubscription) {
      this.initializeSubscription.unsubscribe();
    }
    this.initializeSubscription = undefined;

    if (this.serviceStatus$) {
      this.serviceStatus$.complete();
      this.serviceStatus$ = undefined;
    }
  }
}
