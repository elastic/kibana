/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, noop, isEmpty } from 'lodash/fp';
import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { NO_ALERT_INDEX } from '../../../../common/constants';
import { useKibana } from '../../lib/kibana';

import { SourceQuery } from '../../../graphql/types';

import { sourceQuery } from '../source/index.gql_query';
import { useApolloClient } from '../../utils/apollo_context';
import { SOURCERER_FEATURE_FLAG_ON } from './constants';
import {
  EMPTY_BROWSER_FIELDS,
  EMPTY_DOCVALUE_FIELD,
  getBrowserFields,
  getDocValueFields,
  getIndexFields,
  indicesExistOrDataTemporarilyUnavailable,
} from './format';
import { fetchIndexFields } from './async';
import {
  initialSourcererState,
  sourceGroupSettings,
  sourcererActions,
  sourcererModel,
  sourcererSelectors,
} from '../../store/sourcerer';
import { SecurityPageName } from '../../store/sourcerer/model';

export interface UseSourceManager extends Omit<sourcererModel.SourcererModel, 'sourceGroups'> {
  getManageSourceGroupById: (id: sourcererModel.SourceGroupsType) => sourcererModel.ManageSource;
  initializeSourceGroup: (
    id: sourcererModel.SourceGroupsType,
    indexToAdd?: string[] | null,
    onlyCheckIndexToAdd?: boolean
  ) => void;
  setActiveSourceGroupId: (id: sourcererModel.SourceGroupsType) => void;
  updateSourceGroupIndicies: (
    id: sourcererModel.SourceGroupsType,
    updatedIndicies: string[]
  ) => void;
}

// DEFAULTS/INIT
export const getSourceDefaults = (id: sourcererModel.SourceGroupsType, defaultIndex: string[]) => ({
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

const { sourceGroups: foo, ...rest } = initialSourcererState;
const popopopop: UseSourceManager = {
  ...rest,
  getManageSourceGroupById: (id: sourcererModel.SourceGroupsType) => getSourceDefaults(id, []),
  initializeSourceGroup: () => noop,
  setActiveSourceGroupId: () => noop,
  updateSourceGroupIndicies: () => noop,
};

// HOOKS
export const useSourceManager = (): UseSourceManager => {
  const {
    services: {
      data: { indexPatterns: indexPatternsService },
    },
  } = useKibana();
  const apolloClient = useApolloClient();
  const dispatch = useDispatch();
  const activeSourceGroupId = useSelector(sourcererSelectors.activeSourceGroupIdSelector);
  const availableIndexPatterns = useSelector(sourcererSelectors.availableIndexPatternsSelector);
  const availableSourceGroupIds = useSelector(sourcererSelectors.availableSourceGroupIdsSelector);
  const isIndexPatternsLoading = useSelector(sourcererSelectors.isIndexPatternsLoadingSelector);
  const sourceGroups = useSelector(sourcererSelectors.sourceGroupsSelector);

  // Kibana Index Patterns
  const setIsIndexPatternsLoading = useCallback(
    (loading: boolean) => {
      dispatch(
        sourcererActions.setIsIndexPatternsLoading({
          payload: loading,
        })
      );
    },
    [dispatch]
  );
  const getDefaultIndex = useCallback(
    (indexToAdd?: string[] | null, onlyCheckIndexToAdd?: boolean) => {
      const filterIndexAdd = (indexToAdd ?? []).filter((item) => item !== NO_ALERT_INDEX);
      if (!isEmpty(filterIndexAdd)) {
        return onlyCheckIndexToAdd
          ? filterIndexAdd.sort()
          : [
              ...availableIndexPatterns,
              ...filterIndexAdd.filter((index) => !availableIndexPatterns.includes(index)),
            ].sort();
      }
      return availableIndexPatterns.sort();
    },
    [availableIndexPatterns]
  );
  const setAvailableIndexPatterns = useCallback(
    (availableIndexPatternsNow: string[]) => {
      dispatch(
        sourcererActions.setAvailableIndexPatterns({
          payload: availableIndexPatternsNow,
        })
      );
    },
    [dispatch]
  );
  const fetchKibanaIndexPatterns = useCallback(() => {
    setIsIndexPatternsLoading(true);
    const abortCtrl = new AbortController();

    async function fetchTitles() {
      try {
        const result = await indexPatternsService.getTitles();
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
  }, [indexPatternsService, setAvailableIndexPatterns, setIsIndexPatternsLoading]);

  // Security Solution Source Groups
  const setActiveSourceGroupId = useCallback(
    (sourceGroupId: sourcererModel.SourceGroupsType) => {
      if (availableSourceGroupIds.includes(sourceGroupId)) {
        dispatch(
          sourcererActions.setActiveSourceGroupId({
            payload: sourceGroupId,
          })
        );
      }
    },
    [availableSourceGroupIds, dispatch]
  );
  const setIsSourceLoading = useCallback(
    ({ id, loading }: { id: sourcererModel.SourceGroupsType; loading: boolean }) => {
      dispatch(
        sourcererActions.setIsSourceLoading({
          id,
          payload: loading,
        })
      );
    },
    [dispatch]
  );
  const enrichSource = useCallback(
    (
      id: sourcererModel.SourceGroupsType,
      indexToAdd?: string[] | null,
      onlyCheckIndexToAdd?: boolean
    ) => {
      let isSubscribed = true;
      const abortCtrl = new AbortController();
      if (onlyCheckIndexToAdd && isEmpty(indexToAdd) && indexToAdd != null) {
        return dispatch(
          sourcererActions.setSource({
            id,
            defaultIndex: indexToAdd,
            payload: {
              browserFields: EMPTY_BROWSER_FIELDS,
              docValueFields: EMPTY_DOCVALUE_FIELD,
              errorMessage: null,
              id,
              indexPattern: getIndexFields('', []),
              indexPatterns: [],
              indicesExist: indicesExistOrDataTemporarilyUnavailable(undefined),
              loading: false,
            },
          })
        );
      }
      const defaultIndex = getDefaultIndex(indexToAdd, onlyCheckIndexToAdd);
      const selectedPatterns = defaultIndex.filter((pattern) =>
        availableIndexPatterns.includes(pattern)
      );
      if (sourceGroups[id] == null) {
        dispatch(
          sourcererActions.setSource({
            id,
            defaultIndex: selectedPatterns,
            payload: { defaultPatterns: defaultIndex, id },
          })
        );
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
          const ip = await fetchIndexFields({ indexPatternsService, selectedPatterns });

          if (isSubscribed) {
            dispatch(
              sourcererActions.setSource({
                id,
                defaultIndex: selectedPatterns,
                payload: {
                  browserFields: getBrowserFields(selectedPatterns.join(), ip),
                  docValueFields: getDocValueFields(selectedPatterns.join(), ip),
                  errorMessage: null,
                  id,
                  indexPattern: getIndexFields(selectedPatterns.join(), ip),
                  indexPatterns: selectedPatterns,
                  indicesExist: indicesExistOrDataTemporarilyUnavailable(
                    get('data.source.status.indicesExist', result)
                  ),
                  loading: false,
                },
              })
            );
          }
        } catch (error) {
          if (isSubscribed) {
            dispatch(
              sourcererActions.setSource({
                id,
                defaultIndex: selectedPatterns,
                payload: {
                  errorMessage: error.message,
                  id,
                  loading: false,
                },
              })
            );
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
      availableIndexPatterns,
      dispatch,
      getDefaultIndex,
      sourceGroups,
      indexPatternsService,
      setIsSourceLoading,
    ]
  );

  const initializeSourceGroup = useCallback(
    (
      id: sourcererModel.SourceGroupsType,
      indexToAdd?: string[] | null,
      onlyCheckIndexToAdd?: boolean
    ) => enrichSource(id, indexToAdd, onlyCheckIndexToAdd),
    [enrichSource]
  );

  const updateSourceGroupIndicies = useCallback(
    (id: sourcererModel.SourceGroupsType, updatedIndicies: string[]) => {
      enrichSource(id, updatedIndicies, true);
    },
    [enrichSource]
  );
  const getManageSourceGroupById = useCallback(
    (id: sourcererModel.SourceGroupsType) => {
      const sourceById = sourceGroups[id];
      if (sourceById != null) {
        return sourceById;
      }
      return getSourceDefaults(id, getDefaultIndex());
    },
    [getDefaultIndex, sourceGroups]
  );

  // load initial default index
  useEffect(() => {
    fetchKibanaIndexPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isIndexPatternsLoading) {
      initializeSourceGroup(
        SecurityPageName.default,
        sourceGroupSettings[SecurityPageName.default],
        true
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIndexPatternsLoading]);
  return {
    activeSourceGroupId,
    availableIndexPatterns,
    availableSourceGroupIds,
    isIndexPatternsLoading,
    getManageSourceGroupById,
    initializeSourceGroup,
    setActiveSourceGroupId,
    updateSourceGroupIndicies,
  };
};

const ManageSourceContext = createContext<UseSourceManager>(popopopop);

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
