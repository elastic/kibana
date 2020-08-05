/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { MLFlyoutView } from '../ml_flyout';
import { UptimeSettingsContext } from '../../../../contexts';
import { CLIENT_DEFAULTS } from '../../../../../common/constants';
import * as redux from 'react-redux';

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

  it('renders without errors', () => {
    const wrapper = shallowWithIntl(
      <MLFlyoutView
        isCreatingJob={false}
        onClickCreate={createJob}
        onClose={onClose}
        canCreateMLJob={true}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('shows license info if no ml available', () => {
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
    const wrapper = renderWithIntl(
      <UptimeSettingsContext.Provider value={value}>
        <MLFlyoutView
          isCreatingJob={false}
          onClickCreate={createJob}
          onClose={onClose}
          canCreateMLJob={true}
        />
      </UptimeSettingsContext.Provider>
    );
    const licenseComponent = wrapper.find('.license-info-trial');
    expect(licenseComponent.length).toBe(1);
    expect(wrapper).toMatchSnapshot();
  });

  it('able to create job if valid license is available', () => {
    const value = {
      basePath: '',
      dateRangeStart: DATE_RANGE_START,
      dateRangeEnd: DATE_RANGE_END,
      isApmAvailable: true,
      isInfraAvailable: true,
      isLogsAvailable: true,
    };
    const wrapper = renderWithIntl(
      <UptimeSettingsContext.Provider value={value}>
        <MLFlyoutView
          isCreatingJob={false}
          onClickCreate={createJob}
          onClose={onClose}
          canCreateMLJob={true}
        />
      </UptimeSettingsContext.Provider>
    );

    const licenseComponent = wrapper.find('.license-info-trial');
    expect(licenseComponent.length).toBe(0);
  });
});
