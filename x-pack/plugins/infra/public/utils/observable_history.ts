/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History, Location } from 'history';
import { parse as parseQueryString, ParsedUrlQuery } from 'querystring';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

export interface HistoryEvent {
  location: Location;
  action: 'PUSH' | 'POP' | 'REPLACE';
  searchParams: ParsedUrlQuery;
}

export const createHistoryEventObservable = (history: History): Observable<HistoryEvent> =>
  new Observable<Pick<HistoryEvent, 'location' | 'action'>>(subscriber => {
    subscriber.next({
      location: history.location,
      action: 'POP',
    });
    return history.listen((location, action) => subscriber.next({ location, action }));
  }).pipe(
    map(historyEntry => ({
      ...historyEntry,
      searchParams: parseQueryString(historyEntry.location.search.substring(1)),
    })),
    shareReplay(1)
  );
