/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Temporary Workaround
 * This is not a well-designed container. It only exists to enable quick
 * migration of the redux-based logging ui into the infra-ui codebase. It will
 * be removed during the refactoring to graphql/apollo.
 */
import { connect } from 'react-redux';

import { TimeUnit } from '../../../common/time';
import { bindPlainActionCreators } from '../../utils/typed_redux';

import { minimapActions, minimapSelectors, State, summaryActions } from './state';

export const withMinimapScaleControlsProps = connect(
  (state: State) => ({
    availableMinimapScales,
    minimapScale: minimapSelectors.selectMinimapScale(state),
  }),
  bindPlainActionCreators({
    configureSummary: summaryActions.configureSummary,
    setMinimapScale: minimapActions.setMinimapScale,
  })
);

export const availableMinimapScales = [
  {
    bucketSize: {
      unit: TimeUnit.Day,
      value: 7,
    },
    key: 'year',
    label: '1 Year',
    scale: {
      unit: TimeUnit.Year,
      value: 1,
    },
  },
  {
    bucketSize: {
      unit: TimeUnit.Hour,
      value: 12,
    },
    key: 'month',
    label: '1 Month',
    scale: {
      unit: TimeUnit.Month,
      value: 1,
    },
  },
  {
    bucketSize: {
      unit: TimeUnit.Hour,
      value: 2,
    },
    key: 'week',
    label: '1 Week',
    scale: {
      unit: TimeUnit.Day,
      value: 7,
    },
  },
  {
    bucketSize: {
      unit: TimeUnit.Minute,
      value: 10,
    },
    key: 'day',
    label: '1 Day',
    scale: {
      unit: TimeUnit.Day,
      value: 1,
    },
  },
  {
    bucketSize: {
      unit: TimeUnit.Minute,
      value: 1,
    },
    key: 'hour',
    label: '1 Hour',
    scale: {
      unit: TimeUnit.Hour,
      value: 1,
    },
  },
  {
    bucketSize: {
      unit: TimeUnit.Second,
      value: 1,
    },
    key: 'minute',
    label: '1 Minute',
    scale: {
      unit: TimeUnit.Minute,
      value: 1,
    },
  },
];
