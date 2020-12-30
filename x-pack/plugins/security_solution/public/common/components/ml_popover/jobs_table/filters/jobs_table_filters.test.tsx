/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { JobsTableFiltersComponent } from './jobs_table_filters';
import { SecurityJob } from '../../types';
import { cloneDeep } from 'lodash/fp';
import { mockSecurityJobs } from '../../api.mock';

describe('JobsTableFilters', () => {
  let securityJobs: SecurityJob[];

  beforeEach(() => {
    securityJobs = cloneDeep(mockSecurityJobs);
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <JobsTableFiltersComponent securityJobs={securityJobs} onFilterChanged={jest.fn()} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('when you click Elastic Jobs filter, state is updated and it is selected', () => {
    const onFilterChanged = jest.fn();
    const wrapper = mount(
      <JobsTableFiltersComponent securityJobs={securityJobs} onFilterChanged={onFilterChanged} />
    );

    wrapper.find('[data-test-subj="show-elastic-jobs-filter-button"]').first().simulate('click');
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
      <JobsTableFiltersComponent securityJobs={securityJobs} onFilterChanged={onFilterChanged} />
    );

    wrapper.find('[data-test-subj="show-custom-jobs-filter-button"]').first().simulate('click');
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
      <JobsTableFiltersComponent securityJobs={securityJobs} onFilterChanged={onFilterChanged} />
    );

    wrapper.find('[data-test-subj="show-custom-jobs-filter-button"]').first().simulate('click');
    wrapper.update();

    wrapper.find('[data-test-subj="show-elastic-jobs-filter-button"]').first().simulate('click');
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
      <JobsTableFiltersComponent securityJobs={securityJobs} onFilterChanged={onFilterChanged} />
    );

    wrapper.find('[data-test-subj="show-custom-jobs-filter-button"]').first().simulate('click');
    wrapper.update();

    wrapper.find('[data-test-subj="show-custom-jobs-filter-button"]').first().simulate('click');
    wrapper.update();

    expect(
      wrapper
        .find('[data-test-subj="show-custom-jobs-filter-button"]')
        .first()
        .prop('hasActiveFilters')
    ).toEqual(false);
  });
});
