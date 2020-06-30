/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useEffect } from 'react';
import { Observable, Subject } from 'rxjs';

export const useUnmount$ = (): Observable<true> => {
  const observable = useMemo(() => new Subject<true>(), []);

  useEffect(() => {
    return () => {
      observable.next(true);
      observable.complete();
    };
  });

  return observable;
};
