/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { matchPath } from 'react-router-dom';
import { sourcererActions, sourcererSelectors } from '../../store/sourcerer';
import type {
  SelectedDataView,
  SourcererDataView,
  SourcererUrlState,
} from '../../store/sourcerer/model';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useUserInfo } from '../../../detections/components/user_info';
import { timelineSelectors } from '../../../timelines/store/timeline';
import {
  ALERTS_PATH,
  HOSTS_PATH,
  USERS_PATH,
  NETWORK_PATH,
  OVERVIEW_PATH,
  RULES_PATH,
  CASES_PATH,
  DATA_QUALITY_PATH,
} from '../../../../common/constants';
import { TimelineId } from '../../../../common/types';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { checkIfIndicesExist, getScopePatternListSelection } from '../../store/sourcerer/helpers';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { createSourcererDataView } from './create_sourcerer_data_view';
import { getDataViewStateFromIndexFields, useDataView } from '../source/use_data_view';
import { useFetchIndex } from '../source';
import { useInitializeUrlParam, useUpdateUrlParam } from '../../utils/global_query_string';
import { URL_PARAM_KEY } from '../../hooks/use_url_state';
import { sortWithExcludesAtEnd } from '../../../../common/utils/sourcerer';
import { useKibana } from '../../lib/kibana';

export const useInitSourcerer = (
  scopeId: SourcererScopeName.default | SourcererScopeName.detections = SourcererScopeName.default
) => {
  const dispatch = useDispatch();
  const {
    data: { dataViews },
  } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const initialTimelineSourcerer = useRef(true);
  const initialDetectionSourcerer = useRef(true);
  const { loading: loadingSignalIndex, isSignalIndexExists, signalIndexName } = useUserInfo();
  const updateUrlParam = useUpdateUrlParam<SourcererUrlState>(URL_PARAM_KEY.sourcerer);

  const getDataViewsSelector = useMemo(
    () => sourcererSelectors.getSourcererDataViewsSelector(),
    []
  );
  const { defaultDataView, signalIndexName: signalIndexNameSourcerer } = useDeepEqualSelector(
    (state) => getDataViewsSelector(state)
  );

  const { addError, addWarning } = useAppToasts();

  useEffect(() => {
    if (defaultDataView.error != null) {
      addWarning({
        title: i18n.translate('xpack.securitySolution.sourcerer.permissions.title', {
          defaultMessage: 'Write role required to generate data',
        }),
        text: i18n.translate('xpack.securitySolution.sourcerer.permissions.toastMessage', {
          defaultMessage:
            'Users with write permission need to access the Elastic Security app to initialize the app source data.',
        }),
      });
    }
  }, [addWarning, defaultDataView.error]);

  const getTimelineSelector = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const activeTimeline = useDeepEqualSelector((state) =>
    getTimelineSelector(state, TimelineId.active)
  );

  const sourcererScopeSelector = useMemo(() => sourcererSelectors.getSourcererScopeSelector(), []);
  const {
    sourcererScope: { selectedDataViewId: scopeDataViewId, selectedPatterns, missingPatterns },
  } = useDeepEqualSelector((state) => sourcererScopeSelector(state, scopeId));

  const {
    selectedDataView: timelineSelectedDataView,
    sourcererScope: {
      selectedDataViewId: timelineDataViewId,
      selectedPatterns: timelineSelectedPatterns,
      missingPatterns: timelineMissingPatterns,
    },
  } = useDeepEqualSelector((state) => sourcererScopeSelector(state, SourcererScopeName.timeline));

  const { indexFieldsSearch } = useDataView();

  const onInitializeUrlParam = useCallback(
    (initialState: SourcererUrlState | null) => {
      // Initialize the store with value from UrlParam.
      if (initialState != null) {
        (Object.keys(initialState) as SourcererScopeName[]).forEach((scope) => {
          if (
            !(scope === SourcererScopeName.default && scopeId === SourcererScopeName.detections)
          ) {
            dispatch(
              sourcererActions.setSelectedDataView({
                id: scope,
                selectedDataViewId: initialState[scope]?.id ?? null,
                selectedPatterns: initialState[scope]?.selectedPatterns ?? [],
              })
            );
          }
        });
      } else {
        // Initialize the UrlParam with values from the store.
        // It isn't strictly necessary but I am keeping it for compatibility with the previous implementation.
        if (scopeDataViewId) {
          updateUrlParam({
            [SourcererScopeName.default]: {
              id: scopeDataViewId,
              selectedPatterns,
            },
          });
        }
      }
    },
    [dispatch, scopeDataViewId, scopeId, selectedPatterns, updateUrlParam]
  );

  useInitializeUrlParam<SourcererUrlState>(URL_PARAM_KEY.sourcerer, onInitializeUrlParam);

  /*
   * Note for future engineer:
   * we changed the logic to not fetch all the index fields for every data view on the loading of the app
   * because user can have a lot of them and it can slow down the loading of the app
   * and maybe blow up the memory of the browser. We decided to load this data view on demand,
   * we know that will only have to load this dataview on default and timeline scope.
   * We will use two conditions to see if we need to fetch and initialize the dataview selected.
   * First, we will make sure that we did not already fetch them by using `searchedIds`
   * and then we will init them if selectedPatterns and missingPatterns are empty.
   */
  const searchedIds = useRef<string[]>([]);
  useEffect(() => {
    const activeDataViewIds = [...new Set([scopeDataViewId, timelineDataViewId])];
    activeDataViewIds.forEach((id, i) => {
      if (id != null && id.length > 0 && !searchedIds.current.includes(id)) {
        searchedIds.current = [...searchedIds.current, id];

        const currentScope = i === 0 ? SourcererScopeName.default : SourcererScopeName.timeline;

        const needToBeInit =
          id === scopeDataViewId
            ? selectedPatterns.length === 0 && missingPatterns.length === 0
            : timelineDataViewId === id
            ? timelineMissingPatterns.length === 0 &&
              timelineSelectedDataView?.patternList.length === 0
            : false;

        indexFieldsSearch({
          dataViewId: id,
          scopeId: currentScope,
          needToBeInit,
          ...(needToBeInit && currentScope === SourcererScopeName.timeline
            ? {
                skipScopeUpdate: timelineSelectedPatterns.length > 0,
              }
            : {}),
        });
      }
    });
  }, [
    indexFieldsSearch,
    missingPatterns.length,
    scopeDataViewId,
    selectedPatterns.length,
    timelineDataViewId,
    timelineMissingPatterns.length,
    timelineSelectedDataView,
    timelineSelectedPatterns.length,
  ]);

  // Related to timeline
  useEffect(() => {
    if (
      !loadingSignalIndex &&
      signalIndexName != null &&
      signalIndexNameSourcerer == null &&
      (activeTimeline == null || activeTimeline.savedObjectId == null) &&
      initialTimelineSourcerer.current &&
      defaultDataView.id.length > 0
    ) {
      initialTimelineSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: defaultDataView.id,
          selectedPatterns: getScopePatternListSelection(
            defaultDataView,
            SourcererScopeName.timeline,
            signalIndexName,
            true
          ),
        })
      );
    } else if (
      signalIndexNameSourcerer != null &&
      (activeTimeline == null || activeTimeline.savedObjectId == null) &&
      initialTimelineSourcerer.current &&
      defaultDataView.id.length > 0
    ) {
      initialTimelineSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: defaultDataView.id,
          selectedPatterns: getScopePatternListSelection(
            defaultDataView,
            SourcererScopeName.timeline,
            signalIndexNameSourcerer,
            true
          ),
        })
      );
    }
  }, [
    activeTimeline,
    defaultDataView,
    dispatch,
    loadingSignalIndex,
    signalIndexName,
    signalIndexNameSourcerer,
  ]);
  const { dataViewId } = useSourcererDataView(scopeId);

  const updateSourcererDataView = useCallback(
    (newSignalsIndex: string) => {
      const asyncSearch = async (newPatternList: string[]) => {
        abortCtrl.current = new AbortController();

        dispatch(sourcererActions.setSourcererScopeLoading({ loading: true }));

        try {
          const response = await createSourcererDataView({
            body: { patternList: newPatternList },
            signal: abortCtrl.current.signal,
            dataViewService: dataViews,
            dataViewId,
          });

          if (response?.defaultDataView.patternList.includes(newSignalsIndex)) {
            // first time signals is defined and validated in the sourcerer
            // redo indexFieldsSearch
            indexFieldsSearch({ dataViewId: response.defaultDataView.id });
            dispatch(sourcererActions.setSourcererDataViews(response));
          }
          dispatch(sourcererActions.setSourcererScopeLoading({ loading: false }));
        } catch (err) {
          if (err.name === 'AbortError') {
            // the fetch was canceled, we don't need to do anything about it
          } else {
            addError(err, {
              title: i18n.translate('xpack.securitySolution.sourcerer.error.title', {
                defaultMessage: 'Error updating Security Data View',
              }),
              toastMessage: i18n.translate('xpack.securitySolution.sourcerer.error.toastMessage', {
                defaultMessage: 'Refresh the page',
              }),
            });
          }
          dispatch(sourcererActions.setSourcererScopeLoading({ loading: false }));
        }
      };

      if (defaultDataView.title.indexOf(newSignalsIndex) === -1) {
        abortCtrl.current.abort();
        asyncSearch([...defaultDataView.title.split(','), newSignalsIndex]);
      }
    },
    [defaultDataView.title, dispatch, dataViews, dataViewId, indexFieldsSearch, addError]
  );

  const onSignalIndexUpdated = useCallback(() => {
    if (
      !loadingSignalIndex &&
      signalIndexName != null &&
      signalIndexNameSourcerer == null &&
      defaultDataView.id.length > 0
    ) {
      updateSourcererDataView(signalIndexName);
      dispatch(sourcererActions.setSignalIndexName({ signalIndexName }));
    }
  }, [
    defaultDataView.id.length,
    dispatch,
    loadingSignalIndex,
    signalIndexName,
    signalIndexNameSourcerer,
    updateSourcererDataView,
  ]);

  useEffect(() => {
    onSignalIndexUpdated();
    // because we only want onSignalIndexUpdated to run when signalIndexName updates,
    // but we want to know about the updates from the dependencies of onSignalIndexUpdated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalIndexName]);

  // Related to the detection page
  useEffect(() => {
    if (
      scopeId === SourcererScopeName.detections &&
      isSignalIndexExists &&
      signalIndexName != null &&
      initialDetectionSourcerer.current &&
      defaultDataView.id.length > 0
    ) {
      initialDetectionSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.detections,
          selectedDataViewId: defaultDataView.id,
          selectedPatterns: getScopePatternListSelection(
            defaultDataView,
            SourcererScopeName.detections,
            signalIndexName,
            true
          ),
        })
      );
    } else if (
      scopeId === SourcererScopeName.detections &&
      signalIndexNameSourcerer != null &&
      initialTimelineSourcerer.current &&
      defaultDataView.id.length > 0
    ) {
      initialDetectionSourcerer.current = false;
      sourcererActions.setSelectedDataView({
        id: SourcererScopeName.detections,
        selectedDataViewId: defaultDataView.id,
        selectedPatterns: getScopePatternListSelection(
          defaultDataView,
          SourcererScopeName.detections,
          signalIndexNameSourcerer,
          true
        ),
      });
    }
  }, [
    defaultDataView,
    dispatch,
    isSignalIndexExists,
    scopeId,
    signalIndexName,
    signalIndexNameSourcerer,
  ]);
};

export const useSourcererDataView = (
  scopeId: SourcererScopeName = SourcererScopeName.default
): SelectedDataView => {
  const { getDataViewsSelector, getSourcererDataViewSelector, getScopeSelector } = useMemo(
    () => ({
      getDataViewsSelector: sourcererSelectors.getSourcererDataViewsSelector(),
      getSourcererDataViewSelector: sourcererSelectors.sourcererDataViewSelector(),
      getScopeSelector: sourcererSelectors.scopeIdSelector(),
    }),
    []
  );
  const {
    signalIndexName,
    selectedDataView,
    sourcererScope: { missingPatterns, selectedPatterns: scopeSelectedPatterns, loading },
  }: sourcererSelectors.SourcererScopeSelector = useDeepEqualSelector((state) => {
    const sourcererScope = getScopeSelector(state, scopeId);
    return {
      ...getDataViewsSelector(state),
      selectedDataView: getSourcererDataViewSelector(state, sourcererScope.selectedDataViewId),
      sourcererScope,
    };
  });
  const selectedPatterns = useMemo(
    () => sortWithExcludesAtEnd(scopeSelectedPatterns),
    [scopeSelectedPatterns]
  );

  const [legacyPatterns, setLegacyPatterns] = useState<string[]>([]);

  const [indexPatternsLoading, fetchIndexReturn] = useFetchIndex(legacyPatterns);

  const legacyDataView: Omit<SourcererDataView, 'id'> & { id: string | null } = useMemo(
    () => ({
      ...fetchIndexReturn,
      dataView: fetchIndexReturn.dataView,
      runtimeMappings: fetchIndexReturn.dataView?.getRuntimeMappings() ?? {},
      title: fetchIndexReturn.dataView?.getIndexPattern() ?? '',
      id: fetchIndexReturn.dataView?.id ?? null,
      loading: indexPatternsLoading,
      patternList: fetchIndexReturn.indexes,
      indexFields: fetchIndexReturn.indexPatterns
        .fields as SelectedDataView['indexPattern']['fields'],
      fields: fetchIndexReturn.indexPatterns.fields,
    }),
    [fetchIndexReturn, indexPatternsLoading]
  );

  useEffect(() => {
    if (selectedDataView == null || missingPatterns.length > 0) {
      // old way of fetching indices, legacy timeline
      setLegacyPatterns(selectedPatterns);
    } else {
      setLegacyPatterns([]);
    }
  }, [missingPatterns, selectedDataView, selectedPatterns]);

  const sourcererDataView = useMemo(
    () =>
      selectedDataView == null || missingPatterns.length > 0 ? legacyDataView : selectedDataView,
    [legacyDataView, missingPatterns.length, selectedDataView]
  );

  const indicesExist = useMemo(
    () =>
      loading || sourcererDataView.loading
        ? true
        : checkIfIndicesExist({
            scopeId,
            signalIndexName,
            patternList: sourcererDataView.patternList,
          }),
    [loading, scopeId, signalIndexName, sourcererDataView.loading, sourcererDataView.patternList]
  );

  const browserFields = useCallback(() => {
    const { browserFields: dataViewBrowserFields } = getDataViewStateFromIndexFields(
      sourcererDataView.patternList.join(','),
      sourcererDataView.fields,
      false
    );
    return dataViewBrowserFields;
  }, [sourcererDataView.fields, sourcererDataView.patternList]);

  return useMemo(
    () => ({
      browserFields: browserFields(),
      dataViewId: sourcererDataView.id,
      indexPattern: {
        fields: sourcererDataView.indexFields,
        title: selectedPatterns.join(','),
        getName: () => selectedPatterns.join(','),
      },
      indicesExist,
      loading: loading || sourcererDataView.loading,
      runtimeMappings: sourcererDataView.runtimeMappings,
      // all active & inactive patterns in DATA_VIEW
      patternList: sourcererDataView.title.split(','),
      // selected patterns in DATA_VIEW including filter
      selectedPatterns,
      // if we have to do an update to data view, tell us which patterns are active
      ...(legacyPatterns.length > 0 ? { activePatterns: sourcererDataView.patternList } : {}),
      sourcererDataView: sourcererDataView.dataView,
    }),
    [
      browserFields,
      sourcererDataView,
      selectedPatterns,
      indicesExist,
      loading,
      legacyPatterns.length,
    ]
  );
};

const detectionsPaths = [ALERTS_PATH, `${RULES_PATH}/id/:id`, `${CASES_PATH}/:detailName`];

export const getScopeFromPath = (
  pathname: string
): SourcererScopeName.default | SourcererScopeName.detections =>
  matchPath(pathname, {
    path: detectionsPaths,
    strict: false,
  }) == null
    ? SourcererScopeName.default
    : SourcererScopeName.detections;

export const sourcererPaths = [
  ALERTS_PATH,
  DATA_QUALITY_PATH,
  `${RULES_PATH}/id/:id`,
  HOSTS_PATH,
  USERS_PATH,
  NETWORK_PATH,
  OVERVIEW_PATH,
];

export const showSourcererByPath = (pathname: string): boolean =>
  matchPath(pathname, {
    path: sourcererPaths,
    strict: false,
  }) != null;
