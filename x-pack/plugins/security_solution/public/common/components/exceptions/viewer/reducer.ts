/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FilterOptions, RuleExceptionList, ToggleId, ExceptionListItemSchema } from '../types';
import { NamespaceType } from '../../../../../public/lists_plugin_deps';

export interface State {
  filterOptions: FilterOptions;
  availableListTypes: ToggleId[];
  selectedListType: ToggleId;
  selectedListId: string | null;
  selectedListNamespaceType: NamespaceType | null;
  endpointList: RuleExceptionList;
  detectionsList: RuleExceptionList;
  exceptionToEdit: ExceptionListItemSchema | null;
  exceptionToDelete: string | null;
  isModalOpen: boolean;
}

export type Action =
  | {
      type: 'updateAvailableListTypes';
      listTypes: ToggleId[];
      endpointList: RuleExceptionList;
      detectionsList: RuleExceptionList;
    }
  | { type: 'updateSelectedListType'; listType: ToggleId }
  | {
      type: 'updateFilterOptions';
      filterOptions: Partial<FilterOptions>;
    }
  | { type: 'updateModalOpen'; isOpen: boolean }
  | { type: 'updateExceptionToEdit'; exception: ExceptionListItemSchema }
  | { type: 'updateExceptionToDelete'; id: string | null };

export const allExceptionItemsReducer = () => (state: State, action: Action): State => {
  switch (action.type) {
    case 'updateAvailableListTypes': {
      return {
        ...state,
        availableListTypes: action.listTypes,
        endpointList: action.endpointList,
        detectionsList: action.detectionsList,
        selectedListId:
          state.selectedListType === ToggleId.ENDPOINT
            ? action.endpointList.id
            : action.detectionsList.id,
        selectedListNamespaceType:
          state.selectedListType === ToggleId.ENDPOINT
            ? action.endpointList.namespaceType
            : action.detectionsList.namespaceType,
      };
    }
    case 'updateSelectedListType': {
      if (action.listType === ToggleId.ENDPOINT) {
        return {
          ...state,
          selectedListType: action.listType,
          selectedListId: state.endpointList.id,
          selectedListNamespaceType: state.endpointList.namespaceType,
        };
      } else {
        return {
          ...state,
          selectedListType: action.listType,
          selectedListId: state.detectionsList.id,
          selectedListNamespaceType: state.detectionsList.namespaceType,
        };
      }
    }
    case 'updateFilterOptions': {
      return {
        ...state,
        filterOptions: {
          ...state.filterOptions,
          ...action.filterOptions,
        },
      };
    }
    case 'updateExceptionToDelete': {
      return {
        ...state,
        exceptionToDelete: action.id,
      };
    }
    case 'updateExceptionToEdit': {
      return {
        ...state,
        exceptionToEdit: action.exception,
      };
    }
    case 'updateModalOpen': {
      return {
        ...state,
        isModalOpen: action.isOpen,
      };
    }
    default:
      return state;
  }
};
