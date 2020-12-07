/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { Duration } from 'moment';
import { SWIMLANE_TYPE } from '../explorer_constants';
import { AppStateSelectedCells, TimeRangeBounds } from '../explorer_utils';
import { ExplorerAppState } from '../../../../common/types/ml_url_generator';

export const useSelectedCells = (
  appState: ExplorerAppState,
  setAppState: (update: Partial<ExplorerAppState>) => void,
  timeBounds: TimeRangeBounds | undefined,
  bucketInterval: Duration | undefined
): [AppStateSelectedCells | undefined, (swimlaneSelectedCells: AppStateSelectedCells) => void] => {
  // keep swimlane selection, restore selectedCells from AppState
  const selectedCells = useMemo(() => {
    return appState?.mlExplorerSwimlane?.selectedType !== undefined
      ? {
          type: appState.mlExplorerSwimlane.selectedType,
          lanes: appState.mlExplorerSwimlane.selectedLanes!,
          times: appState.mlExplorerSwimlane.selectedTimes!,
          showTopFieldValues: appState.mlExplorerSwimlane.showTopFieldValues,
          viewByFieldName: appState.mlExplorerSwimlane.viewByFieldName,
        }
      : undefined;
    // TODO fix appState to use memoization
  }, [JSON.stringify(appState?.mlExplorerSwimlane)]);

  const setSelectedCells = useCallback(
    (swimlaneSelectedCells?: AppStateSelectedCells) => {
      const mlExplorerSwimlane = {
        ...appState.mlExplorerSwimlane,
      } as ExplorerAppState['mlExplorerSwimlane'];

      if (swimlaneSelectedCells !== undefined) {
        swimlaneSelectedCells.showTopFieldValues = false;

        const currentSwimlaneType = selectedCells?.type;
        const currentShowTopFieldValues = selectedCells?.showTopFieldValues;
        const newSwimlaneType = swimlaneSelectedCells?.type;

        if (
          (currentSwimlaneType === SWIMLANE_TYPE.OVERALL &&
            newSwimlaneType === SWIMLANE_TYPE.VIEW_BY) ||
          newSwimlaneType === SWIMLANE_TYPE.OVERALL ||
          currentShowTopFieldValues === true
        ) {
          swimlaneSelectedCells.showTopFieldValues = true;
        }

        mlExplorerSwimlane.selectedType = swimlaneSelectedCells.type;
        mlExplorerSwimlane.selectedLanes = swimlaneSelectedCells.lanes;
        mlExplorerSwimlane.selectedTimes = swimlaneSelectedCells.times;
        mlExplorerSwimlane.showTopFieldValues = swimlaneSelectedCells.showTopFieldValues;
        setAppState({ mlExplorerSwimlane });
      } else {
        delete mlExplorerSwimlane.selectedType;
        delete mlExplorerSwimlane.selectedLanes;
        delete mlExplorerSwimlane.selectedTimes;
        delete mlExplorerSwimlane.showTopFieldValues;
        setAppState({ mlExplorerSwimlane });
      }
    },
    [appState?.mlExplorerSwimlane, selectedCells, setAppState]
  );

  /**
   * Adjust cell selection with respect to the time boundaries.
   * Reset it entirely when it out of range.
   */
  useEffect(() => {
    if (
      timeBounds === undefined ||
      selectedCells?.times === undefined ||
      bucketInterval === undefined
    )
      return;

    let [selectedFrom, selectedTo] = selectedCells.times;

    const rangeFrom = timeBounds.min!.unix();
    /**
     * Because each cell on the swim lane represent the fixed bucket interval,
     * the selection range could be outside of the time boundaries with
     * correction within the bucket interval.
     */
    const rangeTo = timeBounds.max!.unix() + bucketInterval.asSeconds();

    selectedFrom = Math.max(selectedFrom, rangeFrom);

    selectedTo = Math.min(selectedTo, rangeTo);

    const isSelectionOutOfRange = rangeFrom > selectedTo || rangeTo < selectedFrom;

    if (isSelectionOutOfRange) {
      // reset selection
      setSelectedCells();
      return;
    }

    if (selectedFrom !== rangeFrom || selectedTo !== rangeTo) {
      setSelectedCells({
        ...selectedCells,
        times: [selectedFrom, selectedTo],
      });
    }
  }, [timeBounds, selectedCells, bucketInterval]);

  return [selectedCells, setSelectedCells];
};
