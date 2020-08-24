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

export interface UseSourceManager extends Omit<sourcererModel.SourcererModel, 'sourceGroups'> {
  getManageSourceGroupById: (id: sourcererModel.SourceGroupsType) => sourcererModel.ManageSource;
  initializeSourceGroup: (
    id: sourcererModel.SourceGroupsType,
    indexToAdd?: string[] | null,
    onlyCheckIndexToAdd?: boolean
  ) => void;
  setActiveSourceGroupId: (id: sourcererModel.SourceGroupsType) => void;
  updateSourceGroupIndices: (
    id: sourcererModel.SourceGroupsType,
    updatedIndicies: string[]
  ) => void;
}

// DEFAULTS/INIT
export const getSourceDefaults = (id: sourcererModel.SourceGroupsType, defaultIndex: string[]) => ({
  browserFields: EMPTY_BROWSER_FIELDS,
  scopePatterns: defaultIndex,
  docValueFields: EMPTY_DOCVALUE_FIELD,
  errorMessage: null,
  id,
  indexPattern: getIndexFields(defaultIndex.join(), []),
  selectedPatterns: defaultIndex,
  indicesExist: indicesExistOrDataTemporarilyUnavailable(undefined),
  loading: true,
});
const { sourceGroups: foo, ...rest } = sourcererModel.initialSourcererState;
const initialSourcererManager: UseSourceManager = {
  ...rest,
  getManageSourceGroupById: (id: sourcererModel.SourceGroupsType) => getSourceDefaults(id, []),
  initializeSourceGroup: () => noop,
  setActiveSourceGroupId: () => noop,
  updateSourceGroupIndices: () => noop,
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
  const [routeProps] = useRouteSpy();
  const activeSourceGroupId = useSelector(sourcererSelectors.activeSourceGroupIdSelector);
  const kibanaIndexPatterns = useSelector(sourcererSelectors.kibanaIndexPatternsSelector);
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

  const doesSourceGroupExist = useCallback(
    (id: sourcererModel.SourceGroupsType) => {
      const sourceById = sourceGroups[id];
      if (sourceById != null) {
        return true;
      }
      return false;
    },
    [sourceGroups]
  );
  const setActiveSourceGroupId = useCallback(
    (sourceGroupId: sourcererModel.SourceGroupsType) => {
      if (doesSourceGroupExist(sourceGroupId)) {
        dispatch(
          sourcererActions.setActiveSourceGroupId({
            payload: sourceGroupId,
          })
        );
      }
    },
    [doesSourceGroupExist, dispatch]
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
            payload: {
              browserFields: EMPTY_BROWSER_FIELDS,
              docValueFields: EMPTY_DOCVALUE_FIELD,
              errorMessage: null,
              id,
              indexPattern: getIndexFields('', []),
              selectedPatterns: [],
              indicesExist: indicesExistOrDataTemporarilyUnavailable(undefined),
              loading: false,
            },
          })
        );
      }
      const selectedPatterns = getDefaultIndex(indexToAdd, onlyCheckIndexToAdd);
      if (!doesSourceGroupExist(id)) {
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
                  selectedPatterns,
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
    [apolloClient, dispatch, doesSourceGroupExist, getDefaultIndex, setIsSourceLoading]
  );

  const initializeSourceGroup = useCallback(
    (
      id: sourcererModel.SourceGroupsType,
      indexToAdd?: string[] | null,
      onlyCheckIndexToAdd?: boolean
    ) => enrichSource(id, indexToAdd, onlyCheckIndexToAdd),
    [enrichSource]
  );

  const updateSourceGroupIndices = useCallback(
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
      if (!doesSourceGroupExist(activeScope)) {
        initializeSourceGroup(activeScope, sourcererModel.sourceGroupSettings[activeScope], true);
      }
      setActiveSourceGroupId(activeScope);
    }
  }, [
    doesSourceGroupExist,
    initializeSourceGroup,
    isIndexPatternsLoading,
    routeProps,
    setActiveSourceGroupId,
  ]);

  // load initial default index
  useEffect(() => {
    fetchKibanaIndexPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    activeSourceGroupId,
    getManageSourceGroupById,
    initializeSourceGroup,
    isIndexPatternsLoading,
    kibanaIndexPatterns,
    setActiveSourceGroupId,
    updateSourceGroupIndices,
  };
};

const ManageSourceContext = createContext<UseSourceManager>(initialSourcererManager);

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
