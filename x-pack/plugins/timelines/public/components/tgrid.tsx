/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { TimelineId } from '../store/t_grid/types';
import * as actions from '../store/t_grid/actions';
import { getReduxDeps } from '../store/t_grid';

import { PLUGIN_NAME } from '../../common';
import { TimelineProps } from '../types';

export const TGrid = (props: TimelineProps) => {
  const reduxStuff = getReduxDeps(props.type);
  const dispatch = useDispatch();
  const currentTime = useSelector((state) => state);
  console.log(currentTime);
  const testActionHandler = useCallback(
    () =>
      dispatch(
        actions.setEventsLoading({
          id: TimelineId.test,
          eventIds: [`${Math.random()}`],
          isLoading: false,
        })
      ),
    [dispatch]
  );
  if (props.type === 'standalone') {
    return (
      <div data-test-subj="timeline-wrapper">
        <EuiButton onClick={testActionHandler}>{'whatever'}</EuiButton>
        <h1>{'current time: '}</h1>
      </div>
    );
  } else {
    return (
      <div data-test-subj="timeline-wrapper">
        <h1>{'current time: '}</h1>
      </div>
    );
  }
};

// eslint-disable-next-line import/no-default-export
export { TGrid as default };
