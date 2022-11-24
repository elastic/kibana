/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiToolTip,
  EuiTextColor,
} from '@elastic/eui';

import type { MlSummaryJob } from '@kbn/ml-plugin/public';
import { ML_PAGES, useMlHref } from '@kbn/ml-plugin/public';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import { useEnableDataFeed } from '../../../../common/components/ml_popover/hooks/use_enable_data_feed';
import type { SecurityJob } from '../../../../common/components/ml_popover/types';
import { JobSwitch } from '../../../../common/components/ml_popover/jobs_table/job_switch';
import { useSecurityJobs } from '../../../../common/components/ml_popover/hooks/use_security_jobs';
import { useKibana } from '../../../../common/lib/kibana';
import type { ListItems } from './types';
import * as i18n from './translations';

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

const JobStatusBadgeComponent: React.FC<{ job: MlSummaryJob }> = ({ job }) => {
  const isStarted = isJobStarted(job.jobState, job.datafeedState);
  const color = isStarted ? 'success' : 'danger';
  const text = isStarted ? i18n.ML_JOB_STARTED : i18n.ML_JOB_STOPPED;

  return (
    <EuiBadge data-test-subj="machineLearningJobStatus" color={color}>
      {text}
    </EuiBadge>
  );
};

export const JobStatusBadge = React.memo(JobStatusBadgeComponent);

const StyledJobEuiLInk = styled(EuiLink)`
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
`;

const Wrapper = styled.div`
  overflow: hidden;
`;

const JobLink: React.FC<{
  jobId: string;
}> = ({ jobId }) => {
  const {
    services: { http, ml },
  } = useKibana();
  const jobUrl = useMlHref(ml, http.basePath.get(), {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    pageState: {
      jobId: [jobId],
    },
  });

  return (
    <StyledJobEuiLInk href={jobUrl} target="_blank">
      <span data-test-subj="machineLearningJobId">{jobId}</span>
    </StyledJobEuiLInk>
  );
};

const MlAdminJobDescriptionComponent: React.FC<{
  job: SecurityJob;
  loading: boolean;
  refreshJob: (job: SecurityJob) => void;
}> = ({ job, loading, refreshJob }) => {
  const { enableDatafeed, isLoading: isLoadingEnableDataFeed } = useEnableDataFeed();
  const jobId = job.id;

  const handleJobStateChange = useCallback(
    async (_, latestTimestampMs: number, enable: boolean) => {
      await enableDatafeed(job, latestTimestampMs, enable);
      refreshJob(job);
    },
    [enableDatafeed, job, refreshJob]
  );

  return (
    <Wrapper>
      <div>
        <JobLink jobId={jobId} />
        <AuditIcon message={job.auditMessage} />
      </div>
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false} style={{ marginRight: '0' }}>
          <JobStatusBadge job={job} />
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
  );
};

export const MlAdminJobDescription = React.memo(MlAdminJobDescriptionComponent);

const MlUserJobDescriptionComponent: React.FC<{
  jobId: string;
}> = ({ jobId }) => {
  return <div data-test-subj="machineLearningJobId">{jobId}</div>;
};

const MlUserJobDescription = React.memo(MlUserJobDescriptionComponent);

const MlJobsDescription: React.FC<{ jobIds: string[] }> = ({ jobIds }) => {
  const {
    loading,
    jobs,
    refetch: refreshJobs,
    isMlAdmin,
    isMlUser,
    isLicensed,
  } = useSecurityJobs();
  const relevantJobs = jobs.filter((job) => jobIds.includes(job.id));

  if (!isLicensed) {
    return <EuiTextColor color="subdued">{i18n.ML_JOB_DESCRIPTION_REQUIRED_LICENSE}</EuiTextColor>;
  }

  if (isMlAdmin) {
    return (
      <>
        {relevantJobs.map((job) => (
          <MlAdminJobDescription
            key={job.id}
            job={job}
            loading={loading}
            refreshJob={refreshJobs}
          />
        ))}
      </>
    );
  }

  // displaying all jobs ids without fetching rest of the jobs as useSecurity returns only jobs for admin
  if (isMlUser) {
    return (
      <>
        {jobIds.map((jobId) => (
          <MlUserJobDescription key={jobId} jobId={jobId} />
        ))}
      </>
    );
  }

  return null;
};

export const buildMlJobsDescription = (jobIds: string[], label: string): ListItems => ({
  title: label,
  description: <MlJobsDescription jobIds={jobIds} />,
});
