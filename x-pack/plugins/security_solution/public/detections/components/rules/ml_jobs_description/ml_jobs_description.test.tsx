/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';

import { MlJobsDescription } from './ml_jobs_description';

jest.mock('./admin/ml_admin_jobs_description', () => ({
  MlAdminJobsDescription: () => <div data-test-subj="adminJobs" />,
}));
jest.mock('./user/ml_user_jobs_description', () => ({
  MlUserJobsDescription: () => <div data-test-subj="userJobs" />,
}));
jest.mock('../../../../common/components/ml/hooks/use_ml_capabilities');
jest.mock('../../../../../common/machine_learning/has_ml_admin_permissions');
jest.mock('../../../../../common/machine_learning/has_ml_user_permissions');

const hasMlUserPermissionsMock = hasMlUserPermissions as jest.Mock;

describe('MlUserJobDescription', () => {
  it('should render null if no ML permissions available', () => {
    const { container } = render(<MlJobsDescription jobIds={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('should render user jobs component if ML permissions is for user only', () => {
    hasMlUserPermissionsMock.mockReturnValueOnce(true);
    render(<MlJobsDescription jobIds={[]} />);

    expect(screen.getByTestId('userJobs')).toBeInTheDocument();
    expect(screen.queryByTestId('adminJobs')).not.toBeInTheDocument();
  });

  it('should render admin jobs component if ML permissions is for admin', () => {
    (hasMlAdminPermissions as jest.Mock).mockReturnValueOnce(true);
    render(<MlJobsDescription jobIds={[]} />);

    expect(screen.getByTestId('adminJobs')).toBeInTheDocument();
    expect(screen.queryByTestId('userJobs')).not.toBeInTheDocument();
  });
});
