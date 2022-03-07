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
import {
  SelectedDataView,
  SourcererDataView,
  SourcererScopeName,
} from '../../store/sourcerer/model';
import { useUserInfo } from '../../../detections/components/user_info';
import { timelineSelectors } from '../../../timelines/store/timeline';
import {
  ALERTS_PATH,
  CASES_PATH,
  HOSTS_PATH,
  USERS_PATH,
  NETWORK_PATH,
  OVERVIEW_PATH,
  RULES_PATH,
} from '../../../../common/constants';
import { TimelineId } from '../../../../common/types';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { checkIfIndicesExist, getScopePatternListSelection } from '../../store/sourcerer/helpers';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { postSourcererDataView } from './api';
import { useDataView } from '../source/use_data_view';
import { useFetchIndex } from '../source';

export const useInitSourcerer = (
  scopeId: SourcererScopeName.default | SourcererScopeName.detections = SourcererScopeName.default
) => {
  const dispatch = useDispatch();
  const abortCtrl = useRef(new AbortController());
  const initialTimelineSourcerer = useRef(true);
  const initialDetectionSourcerer = useRef(true);
  const { loading: loadingSignalIndex, isSignalIndexExists, signalIndexName } = useUserInfo();

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
  const scopeIdSelector = useMemo(() => sourcererSelectors.scopeIdSelector(), []);
  const {
    selectedDataViewId: scopeDataViewId,
    selectedPatterns,
    missingPatterns,
  } = useDeepEqualSelector((state) => scopeIdSelector(state, scopeId));
  const {
    selectedDataViewId: timelineDataViewId,
    selectedPatterns: timelineSelectedPatterns,
    missingPatterns: timelineMissingPatterns,
  } = useDeepEqualSelector((state) => scopeIdSelector(state, SourcererScopeName.timeline));
  const { indexFieldsSearch } = useDataView();

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
    activeDataViewIds.forEach((id) => {
      if (id != null && id.length > 0 && !searchedIds.current.includes(id)) {
        searchedIds.current = [...searchedIds.current, id];
        indexFieldsSearch({
          dataViewId: id,
          scopeId:
            id === scopeDataViewId ? SourcererScopeName.default : SourcererScopeName.timeline,
          needToBeInit:
            id === scopeDataViewId
              ? selectedPatterns.length === 0 && missingPatterns.length === 0
              : timelineDataViewId === id
              ? timelineMissingPatterns.length === 0 && timelineSelectedPatterns.length === 0
              : false,
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

  const updateSourcererDataView = useCallback(
    (newSignalsIndex: string) => {
      const asyncSearch = async (newPatternList: string[]) => {
        abortCtrl.current = new AbortController();

        dispatch(sourcererActions.setSourcererScopeLoading({ loading: true }));
        try {
          const response = await postSourcererDataView({
            body: { patternList: newPatternList },
            signal: abortCtrl.current.signal,
          });

          if (response.defaultDataView.patternList.includes(newSignalsIndex)) {
            // first time signals is defined and validated in the sourcerer
            // redo indexFieldsSearch
            indexFieldsSearch({ dataViewId: response.defaultDataView.id });
          }
          dispatch(sourcererActions.setSourcererDataViews(response));
          dispatch(sourcererActions.setSourcererScopeLoading({ loading: false }));
        } catch (err) {
          addError(err, {
            title: i18n.translate('xpack.securitySolution.sourcerer.error.title', {
              defaultMessage: 'Error updating Security Data View',
            }),
            toastMessage: i18n.translate('xpack.securitySolution.sourcerer.error.toastMessage', {
              defaultMessage: 'Refresh the page',
            }),
          });
          dispatch(sourcererActions.setSourcererScopeLoading({ loading: false }));
        }
      };

      if (defaultDataView.title.indexOf(newSignalsIndex) === -1) {
        abortCtrl.current.abort();
        asyncSearch([...defaultDataView.title.split(','), newSignalsIndex]);
      }
    },
    [defaultDataView.title, dispatch, indexFieldsSearch, addError]
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

const LOGS_WILDCARD_INDEX = 'logs-*';
export const EXCLUDE_ELASTIC_CLOUD_INDEX = '-*elastic-cloud-logs-*';

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
    () =>
      scopeSelectedPatterns.some((index) => index === LOGS_WILDCARD_INDEX)
        ? [...scopeSelectedPatterns, EXCLUDE_ELASTIC_CLOUD_INDEX]
        : scopeSelectedPatterns,
    [scopeSelectedPatterns]
  );

  const [legacyPatterns, setLegacyPatterns] = useState<string[]>([]);

  const [indexPatternsLoading, fetchIndexReturn] = useFetchIndex(legacyPatterns);

  const legacyDataView: Omit<SourcererDataView, 'id'> & { id: string | null } = useMemo(
    () => ({
      ...fetchIndexReturn,
      runtimeMappings: {},
      title: '',
      id: selectedDataView?.id ?? null,
      loading: indexPatternsLoading,
      patternList: fetchIndexReturn.indexes,
      indexFields: fetchIndexReturn.indexPatterns
        .fields as SelectedDataView['indexPattern']['fields'],
    }),
    [fetchIndexReturn, indexPatternsLoading, selectedDataView]
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

  return useMemo(
    () => ({
      browserFields: sourcererDataView.browserFields,
      dataViewId: sourcererDataView.id,
      docValueFields: sourcererDataView.docValueFields,
      indexPattern: {
        fields: sourcererDataView.indexFields,
        title: selectedPatterns.join(','),
      },
      indicesExist,
      loading: loading || sourcererDataView.loading,
      runtimeMappings: sourcererDataView.runtimeMappings,
      // all active & inactive patterns in DATA_VIEW
      patternList: sourcererDataView.title.split(','),
      // selected patterns in DATA_VIEW including filter
      selectedPatterns: selectedPatterns.sort(),
      // if we have to do an update to data view, tell us which patterns are active
      ...(legacyPatterns.length > 0 ? { activePatterns: sourcererDataView.patternList } : {}),
    }),
    [sourcererDataView, selectedPatterns, indicesExist, loading, legacyPatterns.length]
  );
};

export const getScopeFromPath = (
  pathname: string
): SourcererScopeName.default | SourcererScopeName.detections =>
  matchPath(pathname, {
    path: [ALERTS_PATH, `${RULES_PATH}/id/:id`, `${CASES_PATH}/:detailName`],
    strict: false,
  }) == null
    ? SourcererScopeName.default
    : SourcererScopeName.detections;

export const sourcererPaths = [
  ALERTS_PATH,
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

export const isAlertsOrRulesDetailsPage = (pathname: string): boolean =>
  matchPath(pathname, {
    path: [ALERTS_PATH, `${RULES_PATH}/id/:id`],
    strict: false,
  }) != null;
