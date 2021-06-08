/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { timelineActions } from '../../../timelines/store/timeline';
import { useRouteSpy } from '../../utils/route/use_route_spy';

import { UrlStateContainerPropTypes, UrlStateProps } from './types';
import { useUrlStateHooks } from './use_url_state';
import { dispatchUpdateTimeline } from '../../../timelines/components/open_timeline/helpers';
import { dispatchSetInitialStateFromUrl } from './initialize_redux_by_url';
import { useUrlState } from './helpers';

export const useSyncUrlState = (props: UrlStateProps) => {
  const dispatch = useDispatch();
  const [routeProps] = useRouteSpy();
  const urlStateProps = useUrlState();
  const actions = {
    setInitialStateFromUrl: useMemo(() => dispatchSetInitialStateFromUrl(dispatch), [dispatch]),
    updateTimeline: useMemo(() => dispatchUpdateTimeline(dispatch), [dispatch]),
    updateTimelineIsLoading: useMemo(
      () => ({ id, isLoading }: { id: string; isLoading: boolean }) =>
        dispatch(timelineActions.updateIsLoading({ id, isLoading })),
      [dispatch]
    ) as ActionCreator<{ id: string; isLoading: boolean }>,
  };
  const syncProps: UrlStateContainerPropTypes = {
    ...routeProps,
    ...props,
    ...urlStateProps,
    ...actions,
  };

  useUrlStateHooks(syncProps);
};
