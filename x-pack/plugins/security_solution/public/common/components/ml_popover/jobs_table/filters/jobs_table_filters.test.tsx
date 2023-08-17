/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { JobsTableFiltersComponent } from './jobs_table_filters';
import type { SecurityJob } from '../../types';
import { cloneDeep } from 'lodash/fp';
import { mockSecurityJobs } from '../../api.mock';

describe('JobsTableFilters', () => {
  let securityJobs: SecurityJob[];

  beforeEach(() => {
    securityJobs = cloneDeep(mockSecurityJobs);
  });

  test('when you click Elastic Jobs filter, state is updated and it is selected', () => {
    const onFilterChanged = jest.fn();
    const wrapper = mount(
      <JobsTableFiltersComponent securityJobs={securityJobs} onFilterChanged={onFilterChanged} />
    );

    wrapper
      .find('button[data-test-subj="show-elastic-jobs-filter-button"]')
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
      <JobsTableFiltersComponent securityJobs={securityJobs} onFilterChanged={onFilterChanged} />
    );

    wrapper
      .find('button[data-test-subj="show-custom-jobs-filter-button"]')
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
      <JobsTableFiltersComponent securityJobs={securityJobs} onFilterChanged={onFilterChanged} />
    );

    wrapper
      .find('button[data-test-subj="show-custom-jobs-filter-button"]')
      .first()
      .simulate('click');
    wrapper.update();

    wrapper
      .find('button[data-test-subj="show-elastic-jobs-filter-button"]')
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
      <JobsTableFiltersComponent securityJobs={securityJobs} onFilterChanged={onFilterChanged} />
    );

    wrapper
      .find('button[data-test-subj="show-custom-jobs-filter-button"]')
      .first()
      .simulate('click');
    wrapper.update();

    wrapper
      .find('button[data-test-subj="show-custom-jobs-filter-button"]')
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
