/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useMemo, memo } from 'react';
import { EuiSwitch, EuiToolTip } from '@elastic/eui';
import noop from 'lodash/noop';

import type { MlSummaryJob } from '@kbn/ml-plugin/public';

import * as i18n from '../translations';

import { isJobStarted } from '../../../../../../common/machine_learning/helpers';

import { MlJobItem } from '../ml_job_item';

const MlUserJobDescriptionComponent: FC<{
  job: MlSummaryJob;
}> = ({ job }) => {
  const switchComponent = useMemo(
    () => (
      <EuiToolTip content={i18n.ML_ADMIN_REQUIRED}>
        <EuiSwitch
          disabled
          data-test-subj="mlUserJobSwitch"
          showLabel={false}
          label=""
          checked={isJobStarted(job.jobState, job.datafeedState)}
          onChange={noop}
        />
      </EuiToolTip>
    ),
    [job]
  );

  return <MlJobItem job={job} switchComponent={switchComponent} />;
};

export const MlUserJobDescription = memo(MlUserJobDescriptionComponent);
