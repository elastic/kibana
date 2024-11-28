/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { UseField } from '../../../../shared_imports';
import { MlJobComboBox } from '../ml_job_select/ml_job_combobox';
import { useSecurityJobs } from '../../../../common/components/ml_popover/hooks/use_security_jobs';

interface MachineLearningJobIdEditProps {
  path: string;
}

export function MachineLearningJobSelector({ path }: MachineLearningJobIdEditProps): JSX.Element {
  const { loading, jobs } = useSecurityJobs();

  const componentProps = useMemo(
    () => ({
      jobs,
      loading,
    }),
    [jobs, loading]
  );

  return <UseField path={path} component={MlJobComboBox} componentProps={componentProps} />;
}
