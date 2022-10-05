/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { JobIdFilter } from './job_id_filter';

describe('JobIdFilter', () => {
  it('is disabled when job id is empty', () => {
    const { getByTestId } = render(
      <JobIdFilter title="Job id" selectedJobIds={[]} jobIds={[]} onSelect={jest.fn()} />
    );
    expect(getByTestId('job-id-filter-button')).toBeDisabled();
  });

  it('calls onSelect when clicked', () => {
    const onSelectCb = jest.fn();
    const { getByText, getByTestId } = render(
      <JobIdFilter
        title="Job id"
        selectedJobIds={[]}
        jobIds={['test_job_1', 'test_job_2', 'test_job_3', 'test_job_4']}
        onSelect={onSelectCb}
      />
    );
    fireEvent.click(getByTestId('job-id-filter-button'));
    fireEvent.click(getByText('test_job_2'));

    expect(onSelectCb).toBeCalledWith(['test_job_2']);
  });

  it('displays job id as selected when it is present in selectedJobIds', () => {
    const { getByTestId } = render(
      <JobIdFilter
        title="Job id"
        selectedJobIds={['test_job_2']}
        jobIds={['test_job_1', 'test_job_2', 'test_job_3', 'test_job_4']}
        onSelect={jest.fn()}
      />
    );

    fireEvent.click(getByTestId('job-id-filter-button'));

    expect(
      getByTestId('job-id-filter-item-test_job_2').querySelector('span[data-euiicon-type=check]')
    ).toBeInTheDocument();
  });
});
