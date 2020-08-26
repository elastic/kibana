/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, noop, isEmpty } from 'lodash/fp';
import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { NO_ALERT_INDEX, SecurityPageName } from '../../../../common/constants';
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
import { sourcererActions, sourcererModel, sourcererSelectors } from '../../store/sourcerer';
import { useRouteSpy } from '../../utils/route/use_route_spy';

export interface UseSourcerer extends Omit<sourcererModel.SourcererModel, 'sourcerScopes'> {
  getSourcererScopeById: (id: sourcererModel.SourcererScopeName) => sourcererModel.ManageScope;
  initializeSourcererScope: (
    id: sourcererModel.SourcererScopeName,
    indexToAdd?: string[] | null,
    onlyCheckIndexToAdd?: boolean
  ) => void;
  setActiveSourcererScopeId: (id: sourcererModel.SourcererScopeName) => void;
  updateSourcererScopeIndices: (
    id: sourcererModel.SourcererScopeName,
    updatedIndicies: string[]
  ) => void;
}

// DEFAULTS/INIT
export const getSourceDefaults = (
  id: sourcererModel.SourcererScopeName,
  defaultIndex: string[]
) => ({
  browserFields: EMPTY_BROWSER_FIELDS,
  docValueFields: EMPTY_DOCVALUE_FIELD,
  errorMessage: null,
  id,
  indexPattern: getIndexFields(defaultIndex.join(), []),
  indicesExist: indicesExistOrDataTemporarilyUnavailable(undefined),
  loading: true,
  scopePatterns: defaultIndex,
  selectedPatterns: defaultIndex,
});
const { sourcerScopes: foo, ...rest } = sourcererModel.initialSourcererState;
const initialUseSourcerer: UseSourcerer = {
  ...rest,
  getSourcererScopeById: (id: sourcererModel.SourcererScopeName) => getSourceDefaults(id, []),
  initializeSourcererScope: () => noop,
  setActiveSourcererScopeId: () => noop,
  updateSourcererScopeIndices: () => noop,
};

// HOOKS
export const useSourcerer = (): UseSourcerer => {
  const {
    services: {
      data: { indexPatterns: indexPatternsService },
    },
  } = useKibana();
  const apolloClient = useApolloClient();
  const dispatch = useDispatch();
  const [routeProps] = useRouteSpy();
  const activeSourcererScopeId = useSelector(sourcererSelectors.activeSourcererScopeIdSelector);
  const kibanaIndexPatterns = useSelector(sourcererSelectors.kibanaIndexPatternsSelector);
  const isIndexPatternsLoading = useSelector(sourcererSelectors.isIndexPatternsLoadingSelector);
  const sourcerScopes = useSelector(sourcererSelectors.sourcerScopesSelector);
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
              ...filterIndexAdd,
              ...kibanaIndexPatterns.filter((index) => !filterIndexAdd.includes(index)),
            ].sort();
      }
      return kibanaIndexPatterns.sort();
    },
    [kibanaIndexPatterns]
  );
  const setKibanaIndexPatterns = useCallback(
    (kibanaIndexPatternsNow: string[]) => {
      dispatch(
        sourcererActions.setKibanaIndexPatterns({
          payload: kibanaIndexPatternsNow,
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
        setKibanaIndexPatterns(result);
        setIsIndexPatternsLoading(false);
      } catch (error) {
        setIsIndexPatternsLoading(false);
      }
    }

    fetchTitles();

    return () => {
      return abortCtrl.abort();
    };
  }, [indexPatternsService, setKibanaIndexPatterns, setIsIndexPatternsLoading]);

  // Security Solution Source Groups

  const doesSourcererScopeExist = useCallback(
    (id: sourcererModel.SourcererScopeName) => {
      const sourceById = sourcerScopes[id];
      if (sourceById != null) {
        return true;
      }
      return false;
    },
    [sourcerScopes]
  );
  const setActiveSourcererScopeId = useCallback(
    (sourceGroupId: sourcererModel.SourcererScopeName) => {
      if (doesSourcererScopeExist(sourceGroupId)) {
        dispatch(
          sourcererActions.setActiveSourcererScopeId({
            payload: sourceGroupId,
          })
        );
      }
    },
    [doesSourcererScopeExist, dispatch]
  );
  const setIsSourceLoading = useCallback(
    ({ id, loading }: { id: sourcererModel.SourcererScopeName; loading: boolean }) => {
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
      id: sourcererModel.SourcererScopeName,
      indexToAdd?: string[] | null,
      onlyCheckIndexToAdd?: boolean
    ) => {
      let isSubscribed = true;
      const abortCtrl = new AbortController();
      if (onlyCheckIndexToAdd && isEmpty(indexToAdd) && indexToAdd != null) {
        return dispatch(
          sourcererActions.setSource({
            id,
            payload: {
              browserFields: EMPTY_BROWSER_FIELDS,
              docValueFields: EMPTY_DOCVALUE_FIELD,
              errorMessage: null,
              id,
              indexPattern: getIndexFields('', []),
              indicesExist: indicesExistOrDataTemporarilyUnavailable(undefined),
              loading: false,
              selectedPatterns: [],
            },
          })
        );
      }
      const selectedPatterns = getDefaultIndex(indexToAdd, onlyCheckIndexToAdd);
      if (!doesSourcererScopeExist(id)) {
        dispatch(
          sourcererActions.setSource({
            id,
            payload: { scopePatterns: selectedPatterns, selectedPatterns, id },
          })
        );
      }

      async function fetchSource() {
        if (!apolloClient) return;
        setIsSourceLoading({ id, loading: true });
        try {
          const result = await apolloClient.query<SourceQuery.Query, SourceQuery.Variables>({
            context: {
              fetchOptions: {
                signal: abortCtrl.signal,
              },
            },
            fetchPolicy: 'network-only',
            query: sourceQuery,
            variables: {
              sourceId: 'default', // always
              defaultIndex: selectedPatterns,
            },
          });
          if (isSubscribed) {
            dispatch(
              sourcererActions.setSource({
                id,
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
                  indicesExist: indicesExistOrDataTemporarilyUnavailable(
                    get('data.source.status.indicesExist', result)
                  ),
                  loading: false,
                  selectedPatterns,
                },
              })
            );
          }
        } catch (error) {
          if (isSubscribed) {
            dispatch(
              sourcererActions.setSource({
                id,
                payload: {
                  errorMessage: error.message,
                  id,
                  loading: false,
                  selectedPatterns,
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
    [apolloClient, dispatch, doesSourcererScopeExist, getDefaultIndex, setIsSourceLoading]
  );

  const initializeSourcererScope = useCallback(
    (
      id: sourcererModel.SourcererScopeName,
      indexToAdd?: string[] | null,
      onlyCheckIndexToAdd?: boolean
    ) => enrichSource(id, indexToAdd, onlyCheckIndexToAdd),
    [enrichSource]
  );

  const updateSourcererScopeIndices = useCallback(
    (id: sourcererModel.SourcererScopeName, updatedIndicies: string[]) => {
      enrichSource(id, updatedIndicies, true);
    },
    [enrichSource]
  );
  const getSourcererScopeById = useCallback(
    (id: sourcererModel.SourcererScopeName) => {
      const sourceById = sourcerScopes[id];
      if (sourceById != null) {
        return sourceById;
      }
      return getSourceDefaults(id, getDefaultIndex());
    },
    [getDefaultIndex, sourcerScopes]
  );

  useEffect(() => {
    if (!isIndexPatternsLoading) {
      let activeScope: sourcererModel.SourcererScopeName;
      switch (routeProps.pageName) {
        case SecurityPageName.detections:
          activeScope = sourcererModel.SourcererScopeName.detections;
          break;
        case SecurityPageName.overview:
          activeScope = sourcererModel.SourcererScopeName.default;
          break;
        case SecurityPageName.hosts:
          activeScope = sourcererModel.SourcererScopeName.host;
          break;
        case SecurityPageName.network:
          activeScope = sourcererModel.SourcererScopeName.network;
          break;
        case SecurityPageName.timelines:
        case SecurityPageName.case:
        case SecurityPageName.administration:
        default:
          activeScope = sourcererModel.SourcererScopeName.default;
          break;
      }
      if (!doesSourcererScopeExist(activeScope)) {
        initializeSourcererScope(
          activeScope,
          sourcererModel.sourcerScopePatterns[activeScope],
          true
        );
      }
      setActiveSourcererScopeId(activeScope);
    }
  }, [
    doesSourcererScopeExist,
    initializeSourcererScope,
    isIndexPatternsLoading,
    routeProps,
    setActiveSourcererScopeId,
  ]);

  // load initial default index
  useEffect(() => {
    fetchKibanaIndexPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    activeSourcererScopeId,
    getSourcererScopeById,
    initializeSourcererScope,
    isIndexPatternsLoading,
    kibanaIndexPatterns,
    setActiveSourcererScopeId,
    updateSourcererScopeIndices,
  };
};

const SourcererContext = createContext<UseSourcerer>(initialUseSourcerer);

export const useSourcererContext = () => useContext(SourcererContext);

interface SourcererProviderProps {
  children: React.ReactNode;
}

export const MaybeSourcererProvider = ({ children }: SourcererProviderProps) => {
  const sourcerer = useSourcerer();
  return <SourcererContext.Provider value={sourcerer}>{children}</SourcererContext.Provider>;
};
export const SourcererProvider = SOURCERER_FEATURE_FLAG_ON
  ? MaybeSourcererProvider
  : ({ children }: SourcererProviderProps) => <>{children}</>;
