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
  MlAdminJobsDescription: () => <div data-test-subj="admin-jobs" />,
}));
jest.mock('./user/ml_user_jobs_description', () => ({
  MlUserJobsDescription: () => <div data-test-subj="user-jobs" />,
}));
jest.mock('../../../../common/components/ml/hooks/use_ml_capabilities');
jest.mock('../../../../../common/machine_learning/has_ml_admin_permissions');
jest.mock('../../../../../common/machine_learning/has_ml_user_permissions');

describe('MlUserJobDescription', () => {
  it('should render null if ML license is absent', () => {
    const { container } = render(<MlJobsDescription jobIds={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('should render user jobs component if ML permissions is for user only', () => {
    (hasMlUserPermissions as jest.Mock).mockReturnValueOnce(true);
    render(<MlJobsDescription jobIds={[]} />);

    expect(screen.getByTestId('user-jobs')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-jobs')).not.toBeInTheDocument();
  });

  it('should render admin jobs component if ML permissions is for admin', () => {
    (hasMlAdminPermissions as jest.Mock).mockReturnValueOnce(true);
    render(<MlJobsDescription jobIds={[]} />);

    expect(screen.getByTestId('admin-jobs')).toBeInTheDocument();
    expect(screen.queryByTestId('user-jobs')).not.toBeInTheDocument();
  });
});
