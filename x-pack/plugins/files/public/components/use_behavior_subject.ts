/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

export function useBehaviorSubject<T>(o$: BehaviorSubject<T>) {
  return useObservable(o$, o$.getValue());
}
