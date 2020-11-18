/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';
import { SWIMLANE_TYPE } from '../explorer_constants';
import { AppStateSelectedCells } from '../explorer_utils';
import { ExplorerAppState } from '../../../../common/types/ml_url_generator';

export const useSelectedCells = (
  appState: ExplorerAppState,
  setAppState: (update: Partial<ExplorerAppState>) => void
): [AppStateSelectedCells | undefined, (swimlaneSelectedCells: AppStateSelectedCells) => void] => {
  // keep swimlane selection, restore selectedCells from AppState
  const selectedCells = useMemo(() => {
    return appState?.mlExplorerSwimlane?.selectedType !== undefined
      ? {
          type: appState.mlExplorerSwimlane.selectedType,
          lanes: appState.mlExplorerSwimlane.selectedLanes,
          times: appState.mlExplorerSwimlane.selectedTimes,
          showTopFieldValues: appState.mlExplorerSwimlane.showTopFieldValues,
          viewByFieldName: appState.mlExplorerSwimlane.viewByFieldName,
        }
      : undefined;
    // TODO fix appState to use memoization
  }, [JSON.stringify(appState?.mlExplorerSwimlane)]);

  const setSelectedCells = useCallback(
    (swimlaneSelectedCells: AppStateSelectedCells) => {
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

  return [selectedCells, setSelectedCells];
};
