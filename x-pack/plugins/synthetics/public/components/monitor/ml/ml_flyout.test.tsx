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
import { render, forNearestButton } from '../../../lib/helper/rtl_helpers';
import * as labels from './translations';

describe('ML Flyout component', () => {
  const createJob = () => {};
  const onClose = () => {};
  const { DATE_RANGE_START, DATE_RANGE_END } = CLIENT_DEFAULTS;
  const defaultContextValue = {
    isDevMode: true,
    basePath: '',
    dateRangeStart: DATE_RANGE_START,
    dateRangeEnd: DATE_RANGE_END,
    isApmAvailable: true,
    isInfraAvailable: true,
    isLogsAvailable: true,
    config: {},
  };

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

    const value = { ...defaultContextValue };

    const { findByText, findAllByText } = render(
      <UptimeSettingsContext.Provider value={value}>
        <MLFlyoutView
          isCreatingJob={false}
          onClickCreate={createJob}
          onClose={onClose}
          canCreateMLJob={true}
        />
        uptime/public/state/api/utils.ts
      </UptimeSettingsContext.Provider>
    );

    expect(await findByText(labels.ENABLE_ANOMALY_DETECTION)).toBeInTheDocument();
    expect(await findAllByText(labels.START_TRAIL)).toHaveLength(2);
  });

  it('able to create job if valid license is available', async () => {
    const value = { ...defaultContextValue };

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

  describe("when users don't have Machine Learning privileges", () => {
    it('shows an informative callout about the need for ML privileges', async () => {
      const value = { ...defaultContextValue };

      const { queryByText } = render(
        <UptimeSettingsContext.Provider value={value}>
          <MLFlyoutView
            isCreatingJob={false}
            onClickCreate={createJob}
            onClose={onClose}
            canCreateMLJob={false}
          />
        </UptimeSettingsContext.Provider>
      );

      expect(
        queryByText('You must have the Kibana privileges for Machine Learning to use this feature.')
      ).toBeInTheDocument();
    });

    it('disables the job creation button', async () => {
      const value = { ...defaultContextValue };

      const { queryByText } = render(
        <UptimeSettingsContext.Provider value={value}>
          <MLFlyoutView
            isCreatingJob={false}
            onClickCreate={createJob}
            onClose={onClose}
            canCreateMLJob={false}
          />
        </UptimeSettingsContext.Provider>
      );

      expect(forNearestButton(queryByText)(labels.CREATE_NEW_JOB)).toBeDisabled();
    });
  });
});
