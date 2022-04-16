/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { TimelineId } from '@kbn/timelines-plugin/common';
import { AppLocation } from '../../../../common/endpoint/types';
import { timelineActions } from '../../../timelines/store/timeline';

/**
 * This component should be used above all routes, but below the Provider.
 * It dispatches actions when the URL is changed.
 */
export const RouteCapture = memo(({ children }) => {
  const location: AppLocation = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(timelineActions.showTimeline({ id: TimelineId.active, show: false }));
  }, [dispatch, location.pathname]);

  useEffect(() => {
    dispatch({ type: 'userChangedUrl', payload: location });
  });

  return <>{children}</>;
});

RouteCapture.displayName = 'RouteCapture';
