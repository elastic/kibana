/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { MlSummaryJob } from '@kbn/ml-plugin/public';

import { MlAdminJobsDescription } from './ml_admin_jobs_description';

import { useSecurityJobs } from '../../../../../common/components/ml_popover/hooks/use_security_jobs';

jest.mock(
  './ml_admin_job_description',
  () =>
    ({
      MlAdminJobDescription: (props) => {
        return <div data-test-subj="adminMock">{props.job.id}</div>;
      },
    } as Record<string, React.FC<{ job: MlSummaryJob }>>)
);

jest.mock('../../../../../common/components/ml_popover/hooks/use_security_jobs');

const useSecurityJobsMock = useSecurityJobs as jest.Mock;

describe('MlAdminJobsDescription', () => {
  it('should render null if admin permissions absent', () => {
    useSecurityJobsMock.mockReturnValueOnce({ jobs: [], isMlAdmin: false });
    const { container } = render(<MlAdminJobsDescription jobIds={['mock-1']} />);

    expect(container.firstChild).toBeNull();
  });

  it('should render only jobs with job ids passed as props', () => {
    useSecurityJobsMock.mockReturnValueOnce({
      jobs: [{ id: 'mock-1' }, { id: 'mock-2' }, { id: 'mock-3' }],
      isMlAdmin: true,
    });
    render(<MlAdminJobsDescription jobIds={['mock-1', 'mock-2', 'mock-4']} />);
    const expectedJobs = screen.getAllByTestId('adminMock');

    expect(expectedJobs).toHaveLength(2);
    expect(expectedJobs[0]).toHaveTextContent('mock-1');
    expect(expectedJobs[1]).toHaveTextContent('mock-2');
  });
});
