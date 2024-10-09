/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, defer, from, of, shareReplay, switchMap } from 'rxjs';

import type { CoreStart } from '@kbn/core/public';

import type { SolutionView } from '../../../common';
import { SHOW_SPACE_SOLUTION_TOUR_SETTING } from '../../../common/constants';
import type { SpacesManager } from '../../spaces_manager';

export function initTour(core: CoreStart, spacesManager: SpacesManager) {
  const showTourUiSettingValue = core.settings.globalClient.get(SHOW_SPACE_SOLUTION_TOUR_SETTING);
  const hasValueInUiSettings = showTourUiSettingValue !== undefined;
  const showTour$ = new BehaviorSubject(showTourUiSettingValue ?? true);

  const allSpaces$ = defer(() => from(spacesManager.getSpaces())).pipe(shareReplay(1));

  const hasMultipleSpaces = (spaces: Array<{ solution?: SolutionView }>) => {
    return spaces.length > 1;
  };

  const isDefaultSpaceOnClassic = (spaces: Array<{ id: string; solution?: SolutionView }>) => {
    const defaultSpace = spaces.find((space) => space.id === 'default');

    if (!defaultSpace) {
      // Don't show the tour if the default space doesn't exist (this should never happen)
      return true;
    }

    if (!defaultSpace.solution || defaultSpace.solution === 'classic') {
      return true;
    }
  };

  const showTourObservable$ = allSpaces$.pipe(
    switchMap((spaces) => {
      // Don't show the tour if there are multiple spaces or the default space is the classic solution
      if (hasMultipleSpaces(spaces) || isDefaultSpaceOnClassic(spaces)) return of(false);

      return showTour$.asObservable();
    })
  );

  const hideTourInGlobalSettings = () => {
    core.settings.globalClient.set(SHOW_SPACE_SOLUTION_TOUR_SETTING, false).catch(() => {
      // Silently swallow errors, the user will just see the tour again next time they load the page
    });
  };

  allSpaces$.subscribe((spaces) => {
    if (
      !hasValueInUiSettings &&
      (hasMultipleSpaces(spaces) || isDefaultSpaceOnClassic(spaces))
    ) {
      // If we have either (1) multiple space or (2) only one space and it's the default space with the classic solution,
      // we don't want to show the tour later on. This can happen in the following scenarios:
      // - the user deletes all the spaces but one (and that last space has a solution set)
      // - the user edits the default space and sets a solution
      // So we can immediately hide the tour in the global settings from now on.
      hideTourInGlobalSettings();
    }
  });

  const onFinishTour = () => {
    hideTourInGlobalSettings();
    showTour$.next(false);
  };

  return { showTour$: showTourObservable$, onFinishTour };
}
