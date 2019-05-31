/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { Observable } from 'rxjs';

export function useObservable<T>(observable$: Observable<T>): T | undefined;
export function useObservable<T>(observable$: Observable<T>, initialValue: T): T;
export function useObservable<T>(observable$: Observable<T>, initialValue?: T): T | undefined {
  const [value, update] = useState<T | undefined>(initialValue);

  useEffect(
    () => {
      const s = observable$.subscribe(update);
      return () => s.unsubscribe();
    },
    [observable$]
  );

  return value;
}
