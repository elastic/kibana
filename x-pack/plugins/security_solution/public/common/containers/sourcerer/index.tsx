/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, noop, isEmpty } from 'lodash/fp';
import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { IIndexPattern } from 'src/plugins/data/public';

import { NO_ALERT_INDEX } from '../../../../common/constants';
import { useKibana } from '../../lib/kibana';

import { SourceQuery } from '../../../graphql/types';

import { sourceQuery } from '../source/index.gql_query';
import { useApolloClient } from '../../utils/apollo_context';
import {
  sourceGroups,
  SecurityPageName,
  SourceGroupsType,
  SOURCERER_FEATURE_FLAG_ON,
} from './constants';
import {
  BrowserFields,
  DocValueFields,
  EMPTY_BROWSER_FIELDS,
  EMPTY_DOCVALUE_FIELD,
  getBrowserFields,
  getDocValueFields,
  getIndexFields,
  indicesExistOrDataTemporarilyUnavailable,
} from './format';

// TYPES
interface ManageSource {
  browserFields: BrowserFields;
  defaultPatterns: string[];
  docValueFields: DocValueFields[];
  errorMessage: string | null;
  id: SourceGroupsType;
  indexPattern: IIndexPattern;
  indexPatterns: string[];
  indicesExist: boolean | undefined | null;
  loading: boolean;
}

interface ManageSourceInit extends Partial<ManageSource> {
  id: SourceGroupsType;
}

type ManageSourceGroupById = {
  [id in SourceGroupsType]?: ManageSource;
};

type ActionManageSource =
  | {
      type: 'SET_SOURCE';
      id: SourceGroupsType;
      defaultIndex: string[];
      payload: ManageSourceInit;
    }
  | {
      type: 'SET_IS_SOURCE_LOADING';
      id: SourceGroupsType;
      payload: boolean;
    }
  | {
      type: 'SET_ACTIVE_SOURCE_GROUP_ID';
      payload: SourceGroupsType;
    }
  | {
      type: 'SET_AVAILABLE_INDEX_PATTERNS';
      payload: string[];
    }
  | {
      type: 'SET_IS_INDEX_PATTERNS_LOADING';
      payload: boolean;
    };

interface ManageSourcerer {
  activeSourceGroupId: SourceGroupsType;
  availableIndexPatterns: string[];
  availableSourceGroupIds: SourceGroupsType[];
  isIndexPatternsLoading: boolean;
  sourceGroups: ManageSourceGroupById;
}

export interface UseSourceManager extends ManageSourcerer {
  getManageSourceGroupById: (id: SourceGroupsType) => ManageSource;
  initializeSourceGroup: (
    id: SourceGroupsType,
    indexToAdd?: string[] | null,
    onlyCheckIndexToAdd?: boolean
  ) => void;
  setActiveSourceGroupId: (id: SourceGroupsType) => void;
  updateSourceGroupIndicies: (id: SourceGroupsType, updatedIndicies: string[]) => void;
}

// DEFAULTS/INIT
export const getSourceDefaults = (id: SourceGroupsType, defaultIndex: string[]) => ({
  browserFields: EMPTY_BROWSER_FIELDS,
  defaultPatterns: defaultIndex,
  docValueFields: EMPTY_DOCVALUE_FIELD,
  errorMessage: null,
  id,
  indexPattern: getIndexFields(defaultIndex.join(), []),
  indexPatterns: defaultIndex,
  indicesExist: indicesExistOrDataTemporarilyUnavailable(undefined),
  loading: true,
});

const initManageSource: ManageSourcerer = {
  activeSourceGroupId: SecurityPageName.default,
  availableIndexPatterns: [],
  availableSourceGroupIds: [],
  isIndexPatternsLoading: true,
  sourceGroups: {},
};
const init: UseSourceManager = {
  ...initManageSource,
  getManageSourceGroupById: (id: SourceGroupsType) => getSourceDefaults(id, []),
  initializeSourceGroup: () => noop,
  setActiveSourceGroupId: () => noop,
  updateSourceGroupIndicies: () => noop,
};

const reducerManageSource = (state: ManageSourcerer, action: ActionManageSource) => {
  switch (action.type) {
    case 'SET_SOURCE':
      return {
        ...state,
        sourceGroups: {
          ...state.sourceGroups,
          [action.id]: {
            ...getSourceDefaults(action.id, action.defaultIndex),
            ...state.sourceGroups[action.id],
            ...action.payload,
          },
        },
        availableSourceGroupIds: state.availableSourceGroupIds.includes(action.id)
          ? state.availableSourceGroupIds
          : [...state.availableSourceGroupIds, action.id],
      };
    case 'SET_IS_SOURCE_LOADING':
      return {
        ...state,
        sourceGroups: {
          ...state.sourceGroups,
          [action.id]: {
            ...state.sourceGroups[action.id],
            id: action.id,
            loading: action.payload,
          },
        },
      };
    case 'SET_ACTIVE_SOURCE_GROUP_ID':
      return {
        ...state,
        activeSourceGroupId: action.payload,
      };
    case 'SET_AVAILABLE_INDEX_PATTERNS':
      return {
        ...state,
        availableIndexPatterns: action.payload,
      };
    case 'SET_IS_INDEX_PATTERNS_LOADING':
      return {
        ...state,
        isIndexPatternsLoading: action.payload,
      };
    default:
      return state;
  }
};

// HOOKS
export const useSourceManager = (): UseSourceManager => {
  const {
    services: {
      data: { indexPatterns },
    },
  } = useKibana();
  const apolloClient = useApolloClient();
  const [state, dispatch] = useReducer(reducerManageSource, initManageSource);

  // Kibana Index Patterns
  const setIsIndexPatternsLoading = useCallback((loading: boolean) => {
    dispatch({
      type: 'SET_IS_INDEX_PATTERNS_LOADING',
      payload: loading,
    });
  }, []);
  const getDefaultIndex = useCallback(
    (indexToAdd?: string[] | null, onlyCheckIndexToAdd?: boolean) => {
      const filterIndexAdd = (indexToAdd ?? []).filter((item) => item !== NO_ALERT_INDEX);
      if (!isEmpty(filterIndexAdd)) {
        return onlyCheckIndexToAdd
          ? filterIndexAdd.sort()
          : [
              ...state.availableIndexPatterns,
              ...filterIndexAdd.filter((index) => !state.availableIndexPatterns.includes(index)),
            ].sort();
      }
      return state.availableIndexPatterns.sort();
    },
    [state.availableIndexPatterns]
  );
  const setAvailableIndexPatterns = useCallback((availableIndexPatterns: string[]) => {
    dispatch({
      type: 'SET_AVAILABLE_INDEX_PATTERNS',
      payload: availableIndexPatterns,
    });
  }, []);
  const fetchKibanaIndexPatterns = useCallback(() => {
    setIsIndexPatternsLoading(true);
    const abortCtrl = new AbortController();

    async function fetchTitles() {
      try {
        const result = await indexPatterns.getTitles();
        setAvailableIndexPatterns(result);
        setIsIndexPatternsLoading(false);
      } catch (error) {
        setIsIndexPatternsLoading(false);
      }
    }

    fetchTitles();

    return () => {
      return abortCtrl.abort();
    };
  }, [indexPatterns, setAvailableIndexPatterns, setIsIndexPatternsLoading]);

  // Security Solution Source Groups
  const setActiveSourceGroupId = useCallback(
    (sourceGroupId: SourceGroupsType) => {
      if (state.availableSourceGroupIds.includes(sourceGroupId)) {
        dispatch({
          type: 'SET_ACTIVE_SOURCE_GROUP_ID',
          payload: sourceGroupId,
        });
      }
    },
    [state.availableSourceGroupIds]
  );
  const setIsSourceLoading = useCallback(
    ({ id, loading }: { id: SourceGroupsType; loading: boolean }) => {
      dispatch({
        type: 'SET_IS_SOURCE_LOADING',
        id,
        payload: loading,
      });
    },
    []
  );
  const enrichSource = useCallback(
    (id: SourceGroupsType, indexToAdd?: string[] | null, onlyCheckIndexToAdd?: boolean) => {
      let isSubscribed = true;
      const abortCtrl = new AbortController();
      const defaultIndex = getDefaultIndex(indexToAdd, onlyCheckIndexToAdd);
      const selectedPatterns = defaultIndex.filter((pattern) =>
        state.availableIndexPatterns.includes(pattern)
      );
      if (state.sourceGroups[id] == null) {
        dispatch({
          type: 'SET_SOURCE',
          id,
          defaultIndex: selectedPatterns,
          payload: { defaultPatterns: defaultIndex, id },
        });
      }

      async function fetchSource() {
        if (!apolloClient) return;
        setIsSourceLoading({ id, loading: true });
        try {
          const result = await apolloClient.query<SourceQuery.Query, SourceQuery.Variables>({
            query: sourceQuery,
            fetchPolicy: 'network-only',
            variables: {
              sourceId: 'default', // always
              defaultIndex: selectedPatterns,
            },
            context: {
              fetchOptions: {
                signal: abortCtrl.signal,
              },
            },
          });
          if (isSubscribed) {
            dispatch({
              type: 'SET_SOURCE',
              id,
              defaultIndex: selectedPatterns,
              payload: {
                browserFields: getBrowserFields(
                  selectedPatterns.join(),
                  get('data.source.status.indexFields', result)
                ),
                docValueFields: getDocValueFields(
                  selectedPatterns.join(),
                  get('data.source.status.indexFields', result)
                ),
                errorMessage: null,
                id,
                indexPattern: getIndexFields(
                  selectedPatterns.join(),
                  get('data.source.status.indexFields', result)
                ),
                indexPatterns: selectedPatterns,
                indicesExist: indicesExistOrDataTemporarilyUnavailable(
                  get('data.source.status.indicesExist', result)
                ),
                loading: false,
              },
            });
          }
        } catch (error) {
          if (isSubscribed) {
            dispatch({
              type: 'SET_SOURCE',
              id,
              defaultIndex: selectedPatterns,
              payload: {
                errorMessage: error.message,
                id,
                loading: false,
              },
            });
          }
        }
      }

      fetchSource();

      return () => {
        isSubscribed = false;
        return abortCtrl.abort();
      };
    },
    [
      apolloClient,
      getDefaultIndex,
      setIsSourceLoading,
      state.availableIndexPatterns,
      state.sourceGroups,
    ]
  );

  const initializeSourceGroup = useCallback(
    (id: SourceGroupsType, indexToAdd?: string[] | null, onlyCheckIndexToAdd?: boolean) =>
      enrichSource(id, indexToAdd, onlyCheckIndexToAdd),
    [enrichSource]
  );

  const updateSourceGroupIndicies = useCallback(
    (id: SourceGroupsType, updatedIndicies: string[]) => enrichSource(id, updatedIndicies, true),
    [enrichSource]
  );
  const getManageSourceGroupById = useCallback(
    (id: SourceGroupsType) => {
      const sourceById = state.sourceGroups[id];
      if (sourceById != null) {
        return sourceById;
      }
      return getSourceDefaults(id, getDefaultIndex());
    },
    [getDefaultIndex, state.sourceGroups]
  );

  // load initial default index
  useEffect(() => {
    fetchKibanaIndexPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state.isIndexPatternsLoading) {
      Object.entries(sourceGroups).forEach(([key, value]) =>
        initializeSourceGroup(key as SourceGroupsType, value, true)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isIndexPatternsLoading]);

  return {
    ...state,
    getManageSourceGroupById,
    initializeSourceGroup,
    setActiveSourceGroupId,
    updateSourceGroupIndicies,
  };
};

const ManageSourceContext = createContext<UseSourceManager>(init);

export const useManageSource = () => useContext(ManageSourceContext);

interface ManageSourceProps {
  children: React.ReactNode;
}

export const MaybeManageSource = ({ children }: ManageSourceProps) => {
  const indexPatternManager = useSourceManager();
  return (
    <ManageSourceContext.Provider value={indexPatternManager}>
      {children}
    </ManageSourceContext.Provider>
  );
};
export const ManageSource = SOURCERER_FEATURE_FLAG_ON
  ? MaybeManageSource
  : ({ children }: ManageSourceProps) => <>{children}</>;
