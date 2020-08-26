/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, noop, isEmpty } from 'lodash/fp';
import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
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
import { ManageScope, SourcererScopeName } from '../../store/sourcerer/model';

export interface UseSourcerer extends Omit<sourcererModel.SourcererModel, 'sourcererScopes'> {
  getSourcererScopeById: (id: sourcererModel.SourcererScopeName) => sourcererModel.ManageScope;
  setActiveSourcererScopeId: (id: sourcererModel.SourcererScopeName) => void;
  updateSourcererScopeIndices: ({
    id,
    selectedPatterns,
  }: {
    id: sourcererModel.SourcererScopeName;
    selectedPatterns: string[];
  }) => void;
}

// DEFAULTS/INIT
export const getSourceDefaults = (
  id: sourcererModel.SourcererScopeName,
  defaultIndex: string[]
): ManageScope => ({
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
const { sourcererScopes: foo, ...rest } = sourcererModel.initialSourcererState;
const initialUseSourcerer: UseSourcerer = {
  ...rest,
  getSourcererScopeById: (id: sourcererModel.SourcererScopeName) => {
    console.log('dear lord dont call this shit', id);
    return getSourceDefaults(id, []);
  },
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
  const sourcererScopes = useSelector(sourcererSelectors.sourcererScopesSelector);
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
      const scopeById = sourcererScopes[id];
      if (scopeById != null) {
        return true;
      }
      return false;
    },
    [sourcererScopes]
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

  const enrichSource = useCallback(
    ({
      id,
      scopePatterns,
      selectedPatterns: indexToAdd,
      onlyCheckIndexToAdd,
    }: {
      id: sourcererModel.SourcererScopeName;
      scopePatterns?: string[];
      selectedPatterns: string[];
      onlyCheckIndexToAdd?: boolean;
    }) => {
      let isSubscribed = true;
      const abortCtrl = new AbortController();
      if (onlyCheckIndexToAdd && isEmpty(indexToAdd)) {
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

      async function fetchSource() {
        if (!apolloClient) return;
        let patternsPayload: {
          scopePatterns?: string[];
          selectedPatterns: string[];
        } = {
          selectedPatterns,
        };
        if (scopePatterns != null) {
          patternsPayload = {
            selectedPatterns,
            scopePatterns,
          };
        }

        dispatch(
          sourcererActions.setSource({
            id,
            payload: {
              id,
              loading: true,
              ...patternsPayload,
            },
          })
        );
        try {
          console.log('apollo query', selectedPatterns);
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
                  ...patternsPayload,
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
                  ...patternsPayload,
                },
              })
            );
          }
        }
      }

      fetchSource().then(() =>
        activeSourcererScopeId !== id ? setActiveSourcererScopeId(id) : null
      );

      return () => {
        isSubscribed = false;
        return abortCtrl.abort();
      };
    },
    [activeSourcererScopeId, apolloClient, dispatch, getDefaultIndex, setActiveSourcererScopeId]
  );

  const initializeSourcererScope = useCallback(
    ({
      id,
      scopePatterns,
      selectedPatterns,
    }: {
      id: sourcererModel.SourcererScopeName;
      scopePatterns: string[];
      selectedPatterns: string[];
    }) => enrichSource({ id, scopePatterns, selectedPatterns, onlyCheckIndexToAdd: true }),
    [enrichSource]
  );

  const updateSourcererScopeIndices = useCallback(
    ({
      id,
      selectedPatterns,
    }: {
      id: sourcererModel.SourcererScopeName;
      selectedPatterns: string[];
    }) => {
      enrichSource({ id, selectedPatterns, onlyCheckIndexToAdd: true });
    },
    [enrichSource]
  );

  const activeScopeByPage: sourcererModel.SourcererScopeName = useMemo(() => {
    switch (routeProps.pageName) {
      case SecurityPageName.detections:
        return sourcererModel.SourcererScopeName.detections;
      case SecurityPageName.overview:
        return sourcererModel.SourcererScopeName.default;
      case SecurityPageName.hosts:
        return sourcererModel.SourcererScopeName.host;
      case SecurityPageName.network:
        return sourcererModel.SourcererScopeName.network;
      case SecurityPageName.timelines:
      case SecurityPageName.case:
      case SecurityPageName.administration:
      default:
        return sourcererModel.SourcererScopeName.default;
    }
  }, [routeProps.pageName]);
  const getSourcererScopeById = useCallback(
    (id: sourcererModel.SourcererScopeName): ManageScope => {
      console.log('getSourcererScopeById', {
        id,
        sourcererScopes,
      });
      if (sourcererScopes[id] != null) {
        return sourcererScopes[id];
      } else {
        console.log('SHOULD I INITIALIZE?', id, {
          activeScopeByPage,
          activeSourcererScopeId,
        });
      }
      return getSourceDefaults(id, getDefaultIndex());
    },
    [activeScopeByPage, activeSourcererScopeId, getDefaultIndex, sourcererScopes]
  );
  const initializeScope = useCallback(
    (activeScope: SourcererScopeName) => {
      if (!doesSourcererScopeExist(activeScope)) {
        console.log('initialize from scope');
        initializeSourcererScope({
          id: activeScope,
          scopePatterns: sourcererModel.sourcererScopePatterns[activeScope],
          selectedPatterns: sourcererModel.sourcererScopePatterns[activeScope],
        });
      } else if (getSourcererScopeById(activeScope) != null) {
        console.log('initialize from url');
        const { loading, selectedPatterns } = getSourcererScopeById(activeScope);
        if (loading) {
          initializeSourcererScope({
            id: activeScope,
            scopePatterns: sourcererModel.sourcererScopePatterns[activeScope],
            selectedPatterns,
          });
        }
      }
      console.count(`sourcerer initializeScope`);
    },
    [doesSourcererScopeExist, getSourcererScopeById, initializeSourcererScope]
  );

  useEffect(() => {
    if (!isIndexPatternsLoading) {
      initializeScope(activeScopeByPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScopeByPage, isIndexPatternsLoading]);

  // load initial default index
  useEffect(() => {
    fetchKibanaIndexPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    activeSourcererScopeId,
    getSourcererScopeById,
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
