/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, type FC, type PropsWithChildren } from 'react';
import { useDispatch } from 'react-redux';

import { useKibana } from '../../../common/lib/kibana';
import {
  createChangeDataviewListener,
  createInitDataviewListener,
  listenerMiddleware,
  startAppListening,
} from '../redux/listeners';
import { init } from '../redux/actions';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../constants';

// NOTE: this can be spawned multiple times, eq. when you need something like a separate data view picker for a subsection of the app -
// for example, in the timeline.
export const DataViewPickerProvider: FC<PropsWithChildren<{}>> = memo(({ children }) => {
  const { services } = useKibana();

  const dispatch = useDispatch();

  useEffect(() => {
    // NOTE: the goal here is to move all side effects and business logic to Redux,
    // so that we only do presentation layer things on React side - for performance reasons and
    // to make the state easier to predict.
    // see: https://redux-toolkit.js.org/api/createListenerMiddleware#overview
    startAppListening(createInitDataviewListener({}));
    startAppListening(createChangeDataviewListener({ dataViewsService: services.dataViews }));

    // NOTE: this can be dispatched at any point, with any data view id
    dispatch(init(DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID));

    // NOTE: Clear existing listeners when services change for some reason (they should not)
    return () => listenerMiddleware.clearListeners();
  }, [services, dispatch]);

  return <>{children}</>;
});

DataViewPickerProvider.displayName = 'DataviewPickerProvider';
