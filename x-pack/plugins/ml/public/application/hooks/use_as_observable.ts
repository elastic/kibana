/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect } from 'react';
import { BehaviorSubject, type Observable } from 'rxjs';

/**
 * Provides an observable based on the input
 * preserving the reference.
 *
 * @param value
 */
export function useAsObservable<T>(value: T): Observable<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subject = useMemo(() => new BehaviorSubject<T>(value), []);

  useEffect(
    function updateSubject() {
      subject.next(value);
    },
    [subject, value]
  );

  return useMemo(() => subject.asObservable(), [subject]);
}
