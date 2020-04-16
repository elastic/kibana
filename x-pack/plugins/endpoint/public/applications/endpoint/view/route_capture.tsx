/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { EndpointAppLocation, AppAction } from '../types';
import { storeCurrentLocation } from '../lib/is_on_page';

/**
 * This component should be used above all routes, but below the Provider.
 * It dispatches actions when the URL is changed.
 */
export const RouteCapture = memo(({ children }) => {
  const location: EndpointAppLocation = useLocation();
  const dispatch: (action: AppAction) => unknown = useDispatch();
  storeCurrentLocation(location); // <<<== This line captures it "globally"
  dispatch({ type: 'userChangedUrl', payload: location });
  return <>{children}</>;
});
