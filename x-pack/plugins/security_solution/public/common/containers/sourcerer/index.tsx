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
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useIndexFields } from '../source';
import { useUserInfo } from '../../../detections/components/user_info';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { ALERTS_PATH, RULES_PATH, UEBA_PATH } from '../../../../common/constants';
import { TimelineId } from '../../../../common';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { getScopePatternListSelection } from '../../store/sourcerer/helpers';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { postSourcererDataView } from './api';

export const useInitSourcerer = (
  scopeId: SourcererScopeName.default | SourcererScopeName.detections = SourcererScopeName.default
) => {
  const dispatch = useDispatch();
  const abortCtrl = useRef(new AbortController());
  const [isLoading, setLoading] = useState(false);
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
    const { id, ...rest } = defaultDataView;
    if (id === null) {
      // if id is null, rest is error
      addError(rest, {
        title: i18n.translate('xpack.securitySolution.sourcerer.permissions.title', {
          defaultMessage: 'Write role required to generate data',
        }),
        toastMessage: i18n.translate('xpack.securitySolution.sourcerer.permissions.toastMessage', {
          defaultMessage:
            'Users with write permission need to access the Elastic Security app to initialize the app source data.',
        }),
      });
    }
  }, [addError, defaultDataView]);

  const getSignalIndexNameSelector = useMemo(
    () => sourcererSelectors.signalIndexNameSelector(),
    []
  );
  const signalIndexNameSelector = useDeepEqualSelector(getSignalIndexNameSelector);

  const getTimelineSelector = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const activeTimeline = useDeepEqualSelector((state) =>
    getTimelineSelector(state, TimelineId.active)
  );

  const updateSourcererDataView = useCallback(
    (newSignalsIndex: string) => {
      const asyncSearch = async (newPatternList: string[]) => {
        abortCtrl.current = new AbortController();
        setLoading(true);
        try {
          console.log('postSourcererDataView', newPatternList);
          const response = await postSourcererDataView({
            body: { patternList: newPatternList, forceSignalsIndex: newSignalsIndex },
            signal: abortCtrl.current.signal,
          });
          console.log('response', response);
          setLoading(false);
          sourcererActions.setSourcererDataViews(response);
        } catch (err) {
          console.log('ERROR GO HERE STEPH', err);
          setLoading(false);
        }
      };
      if (defaultDataView.title.indexOf(newSignalsIndex) === -1) {
        abortCtrl.current.abort();
        asyncSearch([...defaultDataView.title.split(','), newSignalsIndex]);
      }
    },
    [defaultDataView.title]
  );

  useIndexFields(scopeId);
  useIndexFields(SourcererScopeName.timeline);

  useEffect(() => {
    console.log('things', {
      loadingSignalIndex,
      signalIndexName,
      signalIndexNameSelector,
      condition: !loadingSignalIndex && signalIndexName != null && signalIndexNameSelector == null,
    });
    if (!loadingSignalIndex && signalIndexName != null && signalIndexNameSelector == null) {
      // update signal name also updates sourcerer
      updateSourcererDataView(signalIndexName);
      console.log('dispatch setSignalIndexName', signalIndexName);
      dispatch(sourcererActions.setSignalIndexName({ signalIndexName }));
    }
  }, [dispatch, loadingSignalIndex, signalIndexName, signalIndexNameSelector]);

  // Related to timeline
  useEffect(() => {
    if (
      !loadingSignalIndex &&
      signalIndexName != null &&
      signalIndexNameSelector == null &&
      (activeTimeline == null || activeTimeline.savedObjectId == null) &&
      initialTimelineSourcerer.current
    ) {
      initialTimelineSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: defaultDataView.id,
          selectedPatterns: getScopePatternListSelection(
            defaultDataView,
            SourcererScopeName.timeline,
            signalIndexName
          ),
        })
      );
    } else if (
      signalIndexNameSelector != null &&
      (activeTimeline == null || activeTimeline.savedObjectId == null) &&
      initialTimelineSourcerer.current
    ) {
      initialTimelineSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: defaultDataView.id,
          selectedPatterns: getScopePatternListSelection(
            defaultDataView,
            SourcererScopeName.timeline,
            signalIndexNameSelector
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
    signalIndexNameSelector,
  ]);

  // Related to the detection page
  useEffect(() => {
    if (
      scopeId === SourcererScopeName.detections &&
      isSignalIndexExists &&
      signalIndexName != null &&
      initialDetectionSourcerer.current
    ) {
      initialDetectionSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.detections,
          selectedDataViewId: defaultDataView.id,
          selectedPatterns: getScopePatternListSelection(
            defaultDataView,
            SourcererScopeName.detections,
            signalIndexName
          ),
        })
      );
    } else if (
      scopeId === SourcererScopeName.detections &&
      signalIndexNameSelector != null &&
      initialTimelineSourcerer.current
    ) {
      initialDetectionSourcerer.current = false;
      sourcererActions.setSelectedDataView({
        id: SourcererScopeName.detections,
        selectedDataViewId: defaultDataView.id,
        selectedPatterns: getScopePatternListSelection(
          defaultDataView,
          SourcererScopeName.detections,
          signalIndexNameSelector
        ),
      });
    }
  }, [
    defaultDataView,
    dispatch,
    isSignalIndexExists,
    scopeId,
    signalIndexName,
    signalIndexNameSelector,
  ]);
};

export const useSourcererScope = (scope: SourcererScopeName = SourcererScopeName.default) => {
  const sourcererScopeSelector = useMemo(() => sourcererSelectors.getSourcererScopeSelector(), []);
  return useDeepEqualSelector((state) => sourcererScopeSelector(state, scope));
};

export const getScopeFromPath = (
  pathname: string
): SourcererScopeName.default | SourcererScopeName.detections => {
  return matchPath(pathname, {
    path: [ALERTS_PATH, `${RULES_PATH}/id/:id`, `${UEBA_PATH}/:id`],
    strict: false,
  }) == null
    ? SourcererScopeName.default
    : SourcererScopeName.detections;
};
