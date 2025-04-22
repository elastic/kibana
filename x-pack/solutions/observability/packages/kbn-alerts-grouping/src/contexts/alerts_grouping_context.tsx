/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertsGroupingState, GroupModel } from '../types';
import { useHistory } from 'react-router';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

const initialActiveGroups = ['none'];

export const AlertsGroupingContext = createContext({
  groupingState: {} as AlertsGroupingState,
  setGroupingState: (() => {}) as Dispatch<SetStateAction<AlertsGroupingState>>,
});

export const AlertsGroupingContextProvider = ({ children }: PropsWithChildren<{}>) => {
  const [groupingState, setGroupingState] = useState<AlertsGroupingState>({});
  return (
    <AlertsGroupingContext.Provider
      value={useMemo(
        () => ({ groupingState, setGroupingState }),
        [groupingState, setGroupingState]
      )}
    >
      {children}
    </AlertsGroupingContext.Provider>
  );
};

export const useAlertsGroupingState = (groupingId: string) => {
  const urlStorageId = `${groupingId}-grouping`;
  const { groupingState, setGroupingState } = useContext(AlertsGroupingContext);

  const history = useHistory();
  const urlStateStorage = useRef(
    createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    })
  );

  useEffect(() => {
    const sub = urlStateStorage.current
      ?.change$<string[]>(urlStorageId)
      .subscribe((newSearchState) => {
        if (newSearchState) {
          setGroupingState({
            ...groupingState,
            [groupingId]: { ...groupingState[groupingId], activeGroups: newSearchState },
          });
        }
      });

    if (
      urlStateStorage.current?.get<string[]>(urlStorageId) &&
      !groupingState[groupingId]?.activeGroups?.length
    ) {
      setGroupingState({
        ...groupingState,
        [groupingId]: {
          ...groupingState[groupingId],
          activeGroups: urlStateStorage.current?.get<string[]>(urlStorageId) ?? initialActiveGroups,
        },
      });
    }

    return () => {
      sub?.unsubscribe();
    };
  }, [urlStateStorage, groupingState]);

  const updateGrouping = useCallback(
    (groupModel: Partial<GroupModel> | null) => {
      if (groupModel === null) {
        setGroupingState((prevState) => {
          const newState = { ...prevState };
          delete newState[groupingId];

          urlStateStorage.current?.set(urlStorageId, null, {
            replace: true,
          });
          return newState;
        });
        return;
      }
      setGroupingState((prevState) => {
        const newState = {
          ...prevState,
          [groupingId]: {
            options: [],
            // @ts-expect-error activeGroups might not be defined
            activeGroups: initialActiveGroups,
            ...prevState[groupingId],
            ...groupModel,
          },
        };
        urlStateStorage.current?.set(urlStorageId, groupModel.activeGroups, {
          replace: true,
        });
        return newState;
      });
    },
    [setGroupingState, groupingId]
  );
  const grouping = useMemo(
    () => groupingState[groupingId] ?? { activeGroups: ['none'] },
    [groupingState, groupingId]
  );

  return {
    grouping,
    updateGrouping,
  };
};
