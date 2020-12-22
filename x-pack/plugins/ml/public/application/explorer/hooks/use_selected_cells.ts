/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useUrlState } from '../../util/url_state';
import { SWIMLANE_TYPE } from '../explorer_constants';
import { AppStateSelectedCells } from '../explorer_utils';
import { ExplorerAppState } from '../../../../common/types/ml_url_generator';
import { useTimefilter } from '../../contexts/kibana';

export const useSelectedCells = (
  appState: ExplorerAppState,
  setAppState: ReturnType<typeof useUrlState>[1],
  bucketIntervalInSeconds: number | undefined
): [AppStateSelectedCells | undefined, (swimlaneSelectedCells: AppStateSelectedCells) => void] => {
  const timeFilter = useTimefilter();
  const timeBounds = timeFilter.getBounds();

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
      const mlExplorerSwimlane = { ...appState.mlExplorerSwimlane };

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
        setAppState('mlExplorerSwimlane', mlExplorerSwimlane);
      } else {
        delete mlExplorerSwimlane.selectedType;
        delete mlExplorerSwimlane.selectedLanes;
        delete mlExplorerSwimlane.selectedTimes;
        delete mlExplorerSwimlane.showTopFieldValues;
        setAppState('mlExplorerSwimlane', mlExplorerSwimlane);
      }
    },
    [appState?.mlExplorerSwimlane, selectedCells, setAppState]
  );

  /**
   * Adjust cell selection with respect to the time boundaries.
   * Reset it entirely when it out of range.
   */
  useEffect(
    function adjustSwimLaneTimeSelection() {
      if (selectedCells?.times === undefined || bucketIntervalInSeconds === undefined) return;

      const [selectedFrom, selectedTo] = selectedCells.times;

      /**
       * Because each cell on the swim lane represent the fixed bucket interval,
       * the selection range could be outside of the time boundaries with
       * correction within the bucket interval.
       */
      const rangeFrom = timeBounds.min!.unix() - bucketIntervalInSeconds;
      const rangeTo = timeBounds.max!.unix() + bucketIntervalInSeconds;

      const resultFrom = Math.max(selectedFrom, rangeFrom);
      const resultTo = Math.min(selectedTo, rangeTo);

      const isSelectionOutOfRange = rangeFrom > resultTo || rangeTo < resultFrom;

      if (isSelectionOutOfRange) {
        // reset selection
        setSelectedCells();
        return;
      }

      if (selectedFrom === resultFrom && selectedTo === resultTo) {
        // selection is correct, no need to adjust the range
        return;
      }

      if (resultFrom !== rangeFrom || resultTo !== rangeTo) {
        setSelectedCells({
          ...selectedCells,
          times: [resultFrom, resultTo],
        });
      }
    },
    [timeBounds.min?.unix(), timeBounds.max?.unix(), selectedCells, bucketIntervalInSeconds]
  );

  return [selectedCells, setSelectedCells];
};

export interface SelectionTimeRange {
  earliestMs: number;
  latestMs: number;
}

export function getTimeBoundsFromSelection(
  selectedCells: AppStateSelectedCells | undefined
): SelectionTimeRange | undefined {
  if (selectedCells?.times === undefined) {
    return;
  }

  // time property of the cell data is an array, with the elements being
  // the start times of the first and last cell selected.
  return {
    earliestMs: selectedCells.times[0] * 1000,
    // Subtract 1 ms so search does not include start of next bucket.
    latestMs: selectedCells.times[1] * 1000 - 1,
  };
}
