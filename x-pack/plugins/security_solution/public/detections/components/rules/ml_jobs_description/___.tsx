/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, memo } from 'react';

import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { MlSummaryJob } from '@kbn/ml-plugin/public';

import { JobSwitch } from '../../../../common/components/ml_popover/jobs_table/job_switch';
import { useEnableDataFeed } from '../../../../common/components/ml_popover/hooks/use_enable_data_feed';
import * as i18n from './translations';

import { MlJobLink } from '../ml_job_link/ml_job_link';
import { AuditIcon } from './audit_icon';
import { JobStatusBadge } from './ml_job_status_badge';

const Wrapper = styled.div`
  overflow: hidden;
`;

interface MlJobDescriptionProps {
  job: MlSummaryJob;
  loading: boolean;
  refreshJob?: (job: MlSummaryJob) => void;
  isMlAdmin: boolean;
}

const MlJobDescriptionComponent: FC<MlJobDescriptionProps> = ({ job, loading, isMlAdmin }) => {
  return (
    <Wrapper>
      <div>
        <MlJobLink jobId={job.id} />
        <AuditIcon message={job.auditMessage} />
      </div>
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false} style={{ marginRight: '0' }}>
          <JobStatusBadge job={job} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isMlAdmin ? (
            <JobSwitch
              job={job}
              isSecurityJobsLoading={loading || isLoadingEnableDataFeed}
              onJobStateChange={handleJobStateChange}
            />
          ) : (
            <JobSwitch job={job} disabled />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ marginLeft: '0' }}>
          {i18n.ML_RUN_JOB_LABEL}
        </EuiFlexItem>
      </EuiFlexGroup>
    </Wrapper>
  );
};

export const MlJobDescription = memo(MlJobDescriptionComponent);
