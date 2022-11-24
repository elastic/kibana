/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { MlSummaryJob } from '@kbn/ml-plugin/public';
import * as i18n from './translations';

import { MlJobLink } from './ml_job_link';
import { AuditIcon } from './audit_icon';
import { JobStatusBadge } from './ml_job_status';

const Wrapper = styled.div`
  overflow: hidden;
`;

const MlJobItemComponent: FC<{
  job: MlSummaryJob;
  switchComponent: ReactNode;
}> = ({ job, switchComponent }) => {
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
        <EuiFlexItem grow={false}>{switchComponent}</EuiFlexItem>
        <EuiFlexItem grow={false} style={{ marginLeft: '0' }}>
          {i18n.ML_RUN_JOB_LABEL}
        </EuiFlexItem>
      </EuiFlexGroup>
    </Wrapper>
  );
};

export const MlJobItem = memo(MlJobItemComponent);
