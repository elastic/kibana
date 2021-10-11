/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MLFlyoutView } from './ml_flyout';
import { UptimeSettingsContext } from '../../../contexts';
import { CLIENT_DEFAULTS } from '../../../../common/constants';
import * as redux from 'react-redux';
import { render } from '../../../lib/helper/rtl_helpers';
import * as labels from './translations';

describe('ML Flyout component', () => {
  const createJob = () => {};
  const onClose = () => {};
  const { DATE_RANGE_START, DATE_RANGE_END } = CLIENT_DEFAULTS;

  beforeEach(() => {
    const spy = jest.spyOn(redux, 'useDispatch');
    spy.mockReturnValue(jest.fn());

    const spy1 = jest.spyOn(redux, 'useSelector');
    spy1.mockReturnValue(true);
  });

  it('shows license info if no ml available', async () => {
    const spy1 = jest.spyOn(redux, 'useSelector');

    // return false value for no license
    spy1.mockReturnValue(false);

    const value = {
      basePath: '',
      dateRangeStart: DATE_RANGE_START,
      dateRangeEnd: DATE_RANGE_END,
      isApmAvailable: true,
      isInfraAvailable: true,
      isLogsAvailable: true,
    };
    const { findByText, findAllByText } = render(
      <UptimeSettingsContext.Provider value={value}>
        <MLFlyoutView
          isCreatingJob={false}
          onClickCreate={createJob}
          onClose={onClose}
          canCreateMLJob={true}
        />
      </UptimeSettingsContext.Provider>
    );

    expect(await findByText(labels.ENABLE_ANOMALY_DETECTION)).toBeInTheDocument();
    expect(await findAllByText(labels.START_TRAIL)).toHaveLength(2);
  });

  it('able to create job if valid license is available', async () => {
    const value = {
      basePath: '',
      dateRangeStart: DATE_RANGE_START,
      dateRangeEnd: DATE_RANGE_END,
      isApmAvailable: true,
      isInfraAvailable: true,
      isLogsAvailable: true,
    };
    const { queryByText } = render(
      <UptimeSettingsContext.Provider value={value}>
        <MLFlyoutView
          isCreatingJob={false}
          onClickCreate={createJob}
          onClose={onClose}
          canCreateMLJob={true}
        />
      </UptimeSettingsContext.Provider>
    );

    expect(queryByText(labels.START_TRAIL)).not.toBeInTheDocument();
  });
});
