/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { map, scan, shareReplay, switchMap } from 'rxjs/operators';

export interface NavigationSection {
  // the label of the section, should be translated
  label: string | undefined;
  // the key to sort by in ascending order relative to other entries
  sortKey: number;
  // the entries to render inside the section
  entries: NavigationEntry[];
}

export interface NavigationEntry {
  // the label of the menu entry, should be translated
  label: string;
  // the kibana app id
  app: string;
  // the path after the application prefix corresponding to this entry
  path: string;
  // whether to only match when the full path matches, defaults to `false`
  matchFullPath?: boolean;
  // whether to ignore trailing slashes, defaults to `true`
  ignoreTrailingSlash?: boolean;
  // handler to be called when the item is clicked
  onClick?: (event: React.MouseEvent<HTMLElement | HTMLButtonElement, MouseEvent>) => void;
  // shows NEW badge besides the navigation label, which will automatically disappear when menu item is clicked.
  isNewFeature?: boolean;
  // override default path matching logic to determine if nav entry is selected
  matchPath?: (path: string) => boolean;
}

export interface NavigationRegistry {
  registerSections: (sections$: Observable<NavigationSection[]>) => void;
  sections$: Observable<NavigationSection[]>;
}

export const createNavigationRegistry = (): NavigationRegistry => {
  const registeredSections$ = new ReplaySubject<Observable<NavigationSection[]>>();

  const registerSections = (sections$: Observable<NavigationSection[]>) => {
    registeredSections$.next(sections$);
  };

  const sections$: Observable<NavigationSection[]> = registeredSections$.pipe(
    scan(
      (accumulatedSections$, newSections) => accumulatedSections$.add(newSections),
      new Set<Observable<NavigationSection[]>>()
    ),
    switchMap((registeredSections) => combineLatest([...registeredSections])),
    map((registeredSections) =>
      registeredSections.flat().sort((first, second) => first.sortKey - second.sortKey)
    ),
    shareReplay(1)
  );

  return {
    registerSections,
    sections$,
  };
};
