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
  NETWORK_PATH,
  OVERVIEW_PATH,
  RULES_PATH,
  UEBA_PATH,
} from '../../../../common/constants';
import { TimelineId } from '../../../../common';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { getScopePatternListSelection } from '../../store/sourcerer/helpers';
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
  const getDefaultDataViewSelector = useMemo(
    () => sourcererSelectors.defaultDataViewSelector(),
    []
  );
  const defaultDataView = useDeepEqualSelector(getDefaultDataViewSelector);

  const { addError } = useAppToasts();

  useEffect(() => {
    if (defaultDataView.error != null) {
      addError(defaultDataView.error, {
        title: i18n.translate('xpack.securitySolution.sourcerer.permissions.title', {
          defaultMessage: 'Write role required to generate data',
        }),
        toastMessage: i18n.translate('xpack.securitySolution.sourcerer.permissions.toastMessage', {
          defaultMessage:
            'Users with write permission need to access the Elastic Security app to initialize the app source data.',
        }),
      });
    }
  }, [addError, defaultDataView.error]);

  const getSignalIndexNameSelector = useMemo(
    () => sourcererSelectors.signalIndexNameSelector(),
    []
  );
  const signalIndexNameSourcerer = useDeepEqualSelector(getSignalIndexNameSelector);

  const getTimelineSelector = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const activeTimeline = useDeepEqualSelector((state) =>
    getTimelineSelector(state, TimelineId.active)
  );
  const scopeIdSelector = useMemo(() => sourcererSelectors.scopeIdSelector(), []);
  const { selectedDataViewId: scopeDataViewId } = useDeepEqualSelector((state) =>
    scopeIdSelector(state, scopeId)
  );
  const { selectedDataViewId: timelineDataViewId } = useDeepEqualSelector((state) =>
    scopeIdSelector(state, SourcererScopeName.timeline)
  );
  const activeDataViewIds = useMemo(
    () => [...new Set([scopeDataViewId, timelineDataViewId])],
    [scopeDataViewId, timelineDataViewId]
  );
  const { indexFieldsSearch } = useDataView();

  useEffect(
    () => activeDataViewIds.forEach((id) => id != null && id.length > 0 && indexFieldsSearch(id)),
    [activeDataViewIds, indexFieldsSearch]
  );

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
            indexFieldsSearch(response.defaultDataView.id);
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
  useEffect(() => {
    if (
      !loadingSignalIndex &&
      signalIndexName != null &&
      signalIndexNameSourcerer == null &&
      defaultDataView.id.length > 0
    ) {
      // update signal name also updates sourcerer
      // we hit this the first time signal index is created
      updateSourcererDataView(signalIndexName);
      dispatch(sourcererActions.setSignalIndexName({ signalIndexName }));
    }
  }, [
    defaultDataView.id,
    dispatch,
    indexFieldsSearch,
    isSignalIndexExists,
    loadingSignalIndex,
    signalIndexName,
    signalIndexNameSourcerer,
    updateSourcererDataView,
  ]);
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
  const sourcererScopeSelector = useMemo(() => sourcererSelectors.getSourcererScopeSelector(), []);
  const {
    signalIndexName,
    selectedDataView,
    sourcererScope: { selectedPatterns: scopeSelectedPatterns, loading },
  }: sourcererSelectors.SourcererScopeSelector = useDeepEqualSelector((state) =>
    sourcererScopeSelector(state, scopeId)
  );

  const selectedPatterns = useMemo(
    () =>
      scopeSelectedPatterns.some((index) => index === LOGS_WILDCARD_INDEX)
        ? [...scopeSelectedPatterns, EXCLUDE_ELASTIC_CLOUD_INDEX]
        : scopeSelectedPatterns,
    [scopeSelectedPatterns]
  );

  const [legacyPatterns, setLegacyPatterns] = useState<string[]>([]);

  const [indexPatternsLoading, fetchIndexReturn] = useFetchIndex(legacyPatterns);

  const legacyDataView: Omit<SourcererDataView, 'id'> & { id: null } = useMemo(
    () => ({
      ...fetchIndexReturn,
      runtimeMappings: {},
      title: '',
      id: null,
      loading: indexPatternsLoading,
      patternList: fetchIndexReturn.indexes,
      indexFields: fetchIndexReturn.indexPatterns
        .fields as SelectedDataView['indexPattern']['fields'],
    }),
    [fetchIndexReturn, indexPatternsLoading]
  );

  useEffect(() => {
    if (selectedDataView == null) {
      // old way of fetching indices, legacy timeline
      setLegacyPatterns(selectedPatterns);
    }
  }, [selectedDataView, selectedPatterns]);

  const sourcererDataView = useMemo(() => {
    return selectedDataView == null ? legacyDataView : selectedDataView;
  }, [legacyDataView, selectedDataView]);

  return useMemo(
    () => ({
      browserFields: sourcererDataView.browserFields,
      dataViewId: sourcererDataView.id,
      docValueFields: sourcererDataView.docValueFields,
      indexPattern: {
        fields: sourcererDataView.indexFields,
        title: selectedPatterns.join(','),
      },
      indicesExist:
        scopeId === SourcererScopeName.detections
          ? sourcererDataView.patternList.includes(`${signalIndexName}`)
          : scopeId === SourcererScopeName.default
          ? sourcererDataView.patternList.filter((i) => i !== signalIndexName).length > 0
          : sourcererDataView.patternList.length > 0,
      loading: loading || sourcererDataView.loading,
      runtimeMappings: sourcererDataView.runtimeMappings,
      // all active & inactive patterns in DATA_VIEW
      patternList: sourcererDataView.title.split(','),
      // selected patterns in DATA_VIEW
      selectedPatterns: selectedPatterns.sort(),
    }),
    [loading, selectedPatterns, signalIndexName, scopeId, sourcererDataView]
  );
};

export const getScopeFromPath = (
  pathname: string
): SourcererScopeName.default | SourcererScopeName.detections =>
  matchPath(pathname, {
    path: [ALERTS_PATH, `${RULES_PATH}/id/:id`, `${UEBA_PATH}/:id`, `${CASES_PATH}/:detailName`],
    strict: false,
  }) == null
    ? SourcererScopeName.default
    : SourcererScopeName.detections;

export const sourcererPaths = [
  ALERTS_PATH,
  `${RULES_PATH}/id/:id`,
  HOSTS_PATH,
  NETWORK_PATH,
  OVERVIEW_PATH,
  UEBA_PATH,
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
