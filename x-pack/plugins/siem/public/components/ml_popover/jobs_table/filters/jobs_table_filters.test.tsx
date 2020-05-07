/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { JobsTableFiltersComponent } from './jobs_table_filters';
import { SiemJob } from '../../types';
import { cloneDeep } from 'lodash/fp';
import { mockSiemJobs } from '../../__mocks__/api';

describe('JobsTableFilters', () => {
  let siemJobs: SiemJob[];

  beforeEach(() => {
    siemJobs = cloneDeep(mockSiemJobs);
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <JobsTableFiltersComponent siemJobs={siemJobs} onFilterChanged={jest.fn()} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('when you click Elastic Jobs filter, state is updated and it is selected', () => {
    const onFilterChanged = jest.fn();
    const wrapper = mount(
      <JobsTableFiltersComponent siemJobs={siemJobs} onFilterChanged={onFilterChanged} />
    );

    wrapper
      .find('[data-test-subj="show-elastic-jobs-filter-button"]')
      .first()
      .simulate('click');
    wrapper.update();

    expect(
      wrapper
        .find('[data-test-subj="show-elastic-jobs-filter-button"]')
        .first()
        .prop('hasActiveFilters')
    ).toEqual(true);
  });

  test('when you click Custom Jobs filter, state is updated and it is selected', () => {
    const onFilterChanged = jest.fn();
    const wrapper = mount(
      <JobsTableFiltersComponent siemJobs={siemJobs} onFilterChanged={onFilterChanged} />
    );

    wrapper
      .find('[data-test-subj="show-custom-jobs-filter-button"]')
      .first()
      .simulate('click');
    wrapper.update();

    expect(
      wrapper
        .find('[data-test-subj="show-custom-jobs-filter-button"]')
        .first()
        .prop('hasActiveFilters')
    ).toEqual(true);
  });

  test('when you click Custom Jobs filter once, then Elastic Jobs filter, state is updated and  selected changed', () => {
    const onFilterChanged = jest.fn();
    const wrapper = mount(
      <JobsTableFiltersComponent siemJobs={siemJobs} onFilterChanged={onFilterChanged} />
    );

    wrapper
      .find('[data-test-subj="show-custom-jobs-filter-button"]')
      .first()
      .simulate('click');
    wrapper.update();

    wrapper
      .find('[data-test-subj="show-elastic-jobs-filter-button"]')
      .first()
      .simulate('click');
    wrapper.update();

    expect(
      wrapper
        .find('[data-test-subj="show-custom-jobs-filter-button"]')
        .first()
        .prop('hasActiveFilters')
    ).toEqual(false);
    expect(
      wrapper
        .find('[data-test-subj="show-elastic-jobs-filter-button"]')
        .first()
        .prop('hasActiveFilters')
    ).toEqual(true);
  });

  test('when you click Custom Jobs filter twice, state is updated and it is revert', () => {
    const onFilterChanged = jest.fn();
    const wrapper = mount(
      <JobsTableFiltersComponent siemJobs={siemJobs} onFilterChanged={onFilterChanged} />
    );

    wrapper
      .find('[data-test-subj="show-custom-jobs-filter-button"]')
      .first()
      .simulate('click');
    wrapper.update();

    wrapper
      .find('[data-test-subj="show-custom-jobs-filter-button"]')
      .first()
      .simulate('click');
    wrapper.update();

    expect(
      wrapper
        .find('[data-test-subj="show-custom-jobs-filter-button"]')
        .first()
        .prop('hasActiveFilters')
    ).toEqual(false);
  });
});
