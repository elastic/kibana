/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';

import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';

import { MlAdminJobsDescription } from './admin/ml_admin_jobs_description';
import { MlUserJobsDescription } from './user/ml_user_jobs_description';

interface MlJobsDescriptionProps {
  jobIds: string[];
}

const MlJobsDescriptionComponent: FC<MlJobsDescriptionProps> = ({ jobIds }) => {
  const mlCapabilities = useMlCapabilities();

  const isMlUser = hasMlUserPermissions(mlCapabilities);
  const isMlAdmin = hasMlAdminPermissions(mlCapabilities);

  if (isMlAdmin) {
    return <MlAdminJobsDescription jobIds={jobIds} />;
  }

  if (isMlUser) {
    return <MlUserJobsDescription jobIds={jobIds} />;
  }

  return null;
};

export const MlJobsDescription = memo(MlJobsDescriptionComponent);
