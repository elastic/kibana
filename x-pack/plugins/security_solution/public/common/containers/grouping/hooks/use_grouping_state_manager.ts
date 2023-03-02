/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer } from 'react';
import type {
  Action,
  UpdateActiveGroup,
  UpdateGroupActivePage,
  UpdateGroupItemsPerPage,
  UpdateGroupOptions,
  InitGrouping,
  GroupMap,
  GroupModel,
  GroupOption,
  GroupsById,
  GroupState,
} from './types';
import { ActionType, defaultGroup, EMPTY_GROUP_BY_ID } from './types';

// TODO: actions.ts
const updateActiveGroup = ({
  activeGroup,
  id,
}: {
  activeGroup: string;
  id: string;
}): UpdateActiveGroup => ({
  payload: {
    activeGroup,
    id,
  },
  type: ActionType.updateActiveGroup,
});

const updateGroupActivePage = ({
  activePage,
  id,
}: {
  activePage: number;
  id: string;
}): UpdateGroupActivePage => ({
  payload: {
    activePage,
    id,
  },
  type: ActionType.updateGroupActivePage,
});

const updateGroupItemsPerPage = ({
  itemsPerPage,
  id,
}: {
  itemsPerPage: number;
  id: string;
}): UpdateGroupItemsPerPage => ({
  payload: {
    itemsPerPage,
    id,
  },
  type: ActionType.updateGroupItemsPerPage,
});

const updateGroupOptions = ({
  newOptionList,
  id,
}: {
  newOptionList: GroupOption[];
  id: string;
}): UpdateGroupOptions => ({
  payload: {
    newOptionList,
    id,
  },
  type: ActionType.updateGroupOptions,
});

const initGrouping = ({ id }: { id: string }): InitGrouping => ({
  payload: {
    id,
  },
  type: ActionType.initGrouping,
});

export const groupActions = {
  updateActiveGroup,
  updateGroupActivePage,
  updateGroupItemsPerPage,
  updateGroupOptions,
  initGrouping,
};

// TODO: selectors.ts
const selectGroupByEntityId = (state: GroupState): GroupsById => state.groups.groupById;

export const groupByIdSelector = (state: GroupState, id: string) =>
  selectGroupByEntityId(state)[id];

export const selectGroup = (state: GroupState, entityId: string): GroupModel =>
  state.groups.groupById[entityId];

export const groupsReducer = (state: GroupMap, action: Action) => {
  switch (action.type) {
    case ActionType.updateActiveGroup: {
      const { id, activeGroup } = action.payload;
      return {
        ...state,
        groupById: {
          ...state.groupById,
          [id]: {
            ...state.groupById[id],
            activeGroup,
          },
        },
      };
    }
    case ActionType.updateGroupActivePage: {
      const { id, activePage } = action.payload;
      return {
        ...state,
        groupById: {
          ...state.groupById,
          [id]: {
            ...state.groupById[id],
            activePage,
          },
        },
      };
    }
    case ActionType.updateGroupItemsPerPage: {
      const { id, itemsPerPage } = action.payload;
      return {
        ...state,
        groupById: {
          ...state.groupById,
          [id]: {
            ...state.groupById[id],
            itemsPerPage,
          },
        },
      };
    }
    case ActionType.updateGroupOptions: {
      const { id, newOptionList } = action.payload;
      return {
        ...state,
        groupById: {
          ...state.groupById,
          [id]: {
            ...state.groupById[id],
            options: newOptionList,
          },
        },
      };
    }
    case ActionType.initGrouping: {
      const { id } = action.payload;
      return {
        ...state,
        groupById: {
          ...state.groupById,
          [id]: {
            ...defaultGroup,
            ...state.groupById[id],
          },
        },
      };
    }
  }
  throw Error(`Unknown grouping action`);
};
const initialState: GroupMap = {
  groupById: EMPTY_GROUP_BY_ID,
};
export const useGroupingStateManager = () => {
  const [state, dispatch] = useReducer(groupsReducer, initialState);

  return { state, dispatch };
};
