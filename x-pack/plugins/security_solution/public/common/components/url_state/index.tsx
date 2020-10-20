/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory, useLocation, useParams } from 'react-router-dom';

import { timelineActions } from '../../../timelines/store/timeline';

import { UrlStateProps } from './types';
import { useUrlStateHooks } from './use_url_state';
import { dispatchUpdateTimeline } from '../../../timelines/components/open_timeline/helpers';
import { dispatchSetInitialStateFromUrl } from './initialize_redux_by_url';
import { makeMapStateToProps } from './helpers';
import { useDeepEqualSelector } from '../../hooks/use_selector';

const mapStateToProps = makeMapStateToProps();

export const useUrlState = (props: UrlStateProps) => {
  const { replace: historyReplace } = useHistory();
  const dispatch = useDispatch();
  const { urlState } = useDeepEqualSelector(mapStateToProps);
  const { pathname, search, state } = useLocation();
  const routeParams = useParams();

  console.error('location', pathname, search, state);
  console.error('params', routeParams);

  const setInitialStateFromUrl = useMemo(() => dispatchSetInitialStateFromUrl(dispatch), [
    dispatch,
  ]);
  const updateTimeline = useMemo(() => dispatchUpdateTimeline(dispatch), [dispatch]);

  const updateTimelineIsLoading = useCallback(
    (payload) => dispatch(timelineActions.updateIsLoading(payload)),
    [dispatch]
  );

  return useUrlStateHooks({
    ...props,
    ...routeParams,
    pathname,
    search,
    state,
    pageName: state?.pageName,
    urlState,
    historyReplace,
    setInitialStateFromUrl,
    updateTimeline,
    updateTimelineIsLoading,
  });
};
