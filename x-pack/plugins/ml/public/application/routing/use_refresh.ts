/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useObservable } from 'react-use';
import { merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { annotationsRefresh$ } from '../services/annotations_service';
import {
  mlTimefilterRefresh$,
  mlTimefilterTimeChange$,
} from '../services/timefilter_refresh_service';

export interface Refresh {
  lastRefresh: number;
  timeRange?: { start: string; end: string };
}

const refresh$: Observable<Refresh> = merge(
  mlTimefilterRefresh$,
  mlTimefilterTimeChange$,
  annotationsRefresh$.pipe(map(d => ({ lastRefresh: d })))
);

export const useRefresh = () => {
  return useObservable<Refresh>(refresh$);
};
