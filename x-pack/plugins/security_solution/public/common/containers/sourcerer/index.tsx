/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { matchPath } from 'react-router-dom';
import { sourcererActions, sourcererSelectors } from '../../store/sourcerer';
import { SelectedDataView, SourcererScopeName } from '../../store/sourcerer/model';
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
    sourcererDataView: selectedDataView,
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

  return useMemo(
    () => ({
      browserFields: selectedDataView.browserFields,
      dataViewId: selectedDataView.id,
      docValueFields: selectedDataView.docValueFields,
      indexPattern: {
        fields: selectedDataView.indexFields,
        title: selectedPatterns.join(','),
      },
      indicesExist:
        scopeId === SourcererScopeName.detections
          ? selectedDataView.patternList.includes(`${signalIndexName}`)
          : scopeId === SourcererScopeName.default
          ? selectedDataView.patternList.filter((i) => i !== signalIndexName).length > 0
          : selectedDataView.patternList.length > 0,
      loading: loading || selectedDataView.loading,
      runtimeMappings: selectedDataView.runtimeMappings,
      // all active & inactive patterns in DATA_VIEW
      patternList: selectedDataView.title.split(','),
      // selected patterns in DATA_VIEW
      selectedPatterns: selectedPatterns.sort(),
    }),
    [loading, selectedPatterns, signalIndexName, scopeId, selectedDataView]
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
