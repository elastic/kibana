/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiSwitch } from '@elastic/eui';

import type { MlSummaryJob } from '@kbn/ml-plugin/public';

import { MlJobItem } from './ml_job_item';

const MlUserJobDescriptionComponent: FC<{
  job: MlSummaryJob;
}> = ({ job }) => {
  const switchComponent = useMemo(
    () => (
      <EuiSwitch
        disabled
        data-test-subj="job-switch"
        showLabel={false}
        label=""
        checked
        onChange={() => {}}
      />
    ),
    []
  );

  return <MlJobItem job={job} switchComponent={switchComponent} />;
};

export const MlUserJobDescription = React.memo(MlUserJobDescriptionComponent);
