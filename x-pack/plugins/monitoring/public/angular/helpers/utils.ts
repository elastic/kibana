/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScope } from 'angular';
import * as Rx from 'rxjs';

/**
 * Subscribe to an observable at a $scope, ensuring that the digest cycle
 * is run for subscriber hooks and routing errors to fatalError if not handled.
 */
export const subscribeWithScope = <T>(
  $scope: IScope,
  observable: Rx.Observable<T>,
  observer?: Rx.PartialObserver<T>
) => {
  return observable.subscribe({
    next(value) {
      if (observer && observer.next) {
        $scope.$applyAsync(() => observer.next!(value));
      }
    },
    error(error) {
      $scope.$applyAsync(() => {
        if (observer && observer.error) {
          observer.error(error);
        } else {
          throw new Error(
            `Uncaught error in subscribeWithScope(): ${
              error ? error.stack || error.message : error
            }`
          );
        }
      });
    },
    complete() {
      if (observer && observer.complete) {
        $scope.$applyAsync(() => observer.complete!());
      }
    },
  });
};
