/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';

import type { MlSummaryJob } from '@kbn/ml-plugin/public';
import { ML_PAGES, useMlHref } from '@kbn/ml-plugin/public';
import { useEnableDataFeed } from '../../../../common/components/ml_popover/hooks/use_enable_data_feed';
import type { SecurityJob } from '../../../../common/components/ml_popover/types';
import { JobSwitch } from '../../../../common/components/ml_popover/jobs_table/job_switch';
import { useSecurityJobs } from '../../../../common/components/ml_popover/hooks/use_security_jobs';
import { useKibana } from '../../../../common/lib/kibana';
import type { ListItems } from './types';
import * as i18n from './translations';
import { JobStatusPopover } from './job_status_popover';

enum MessageLevels {
  info = 'info',
  warning = 'warning',
  error = 'error',
}

const AuditIconComponent: React.FC<{
  message: MlSummaryJob['auditMessage'];
}> = ({ message }) => {
  if (!message) {
    return null;
  }

  let color = 'primary';
  let icon = 'alert';

  if (message.level === MessageLevels.info) {
    icon = 'iInCircle';
  } else if (message.level === MessageLevels.warning) {
    color = 'warning';
  } else if (message.level === MessageLevels.error) {
    color = 'danger';
  }

  return (
    <EuiToolTip content={message.text}>
      <EuiIcon type={icon} color={color} />
    </EuiToolTip>
  );
};

export const AuditIcon = React.memo(AuditIconComponent);

const JobLink = styled(EuiLink)`
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
`;

const Wrapper = styled.div`
  overflow: hidden;
`;

const MlJobDescriptionComponent: React.FC<{
  job: SecurityJob;
  loading: boolean;
  refreshJob: (job: SecurityJob) => void;
}> = ({ job, loading, refreshJob }) => {
  const {
    services: { http, ml },
  } = useKibana();
  const { enableDatafeed, isLoading: isLoadingEnableDataFeed } = useEnableDataFeed();
  const jobId = job.id;
  const jobUrl = useMlHref(ml, http.basePath.get(), {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    pageState: {
      jobId: [jobId],
    },
  });

  const jobIdSpan = <span data-test-subj="machineLearningJobId">{jobId}</span>;

  const handleJobStateChange = useCallback(
    async (_, latestTimestampMs: number, enable: boolean) => {
      await enableDatafeed(job, latestTimestampMs, enable);
      refreshJob(job);
    },
    [enableDatafeed, job, refreshJob]
  );

  return job != null ? (
    <Wrapper>
      <div>
        <JobLink href={jobUrl} target="_blank">
          {jobIdSpan}
        </JobLink>
        <AuditIcon message={job.auditMessage} />
      </div>
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false} style={{ marginRight: '0' }}>
          <JobStatusPopover job={job} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <JobSwitch
            job={job}
            isSecurityJobsLoading={loading || isLoadingEnableDataFeed}
            onJobStateChange={handleJobStateChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ marginLeft: '0' }}>
          {i18n.ML_RUN_JOB_LABEL}
        </EuiFlexItem>
      </EuiFlexGroup>
    </Wrapper>
  ) : (
    jobIdSpan
  );
};

export const MlJobDescription = React.memo(MlJobDescriptionComponent);

const MlJobsDescription: React.FC<{ jobIds: string[] }> = ({ jobIds }) => {
  const { loading, jobs, refetch: refreshJobs } = useSecurityJobs();
  const relevantJobs = jobs.filter((job) => jobIds.includes(job.id));
  return (
    <>
      {relevantJobs.map((job) => (
        <MlJobDescription key={job.id} job={job} loading={loading} refreshJob={refreshJobs} />
      ))}
    </>
  );
};

export const buildMlJobsDescription = (jobIds: string[], label: string): ListItems => ({
  title: label,
  description: <MlJobsDescription jobIds={jobIds} />,
});
