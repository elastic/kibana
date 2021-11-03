/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiBadge, EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';

import { ML_PAGES, MlSummaryJob, useMlHref } from '../../../../../../ml/public';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import { useSecurityJobs } from '../../../../common/components/ml_popover/hooks/use_security_jobs';
import { useKibana } from '../../../../common/lib/kibana';
import { ListItems } from './types';
import { ML_JOB_STARTED, ML_JOB_STOPPED } from './translations';

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
  const text = isStarted ? ML_JOB_STARTED : ML_JOB_STOPPED;

  return (
    <EuiBadge data-test-subj="machineLearningJobStatus" color={color}>
      {text}
    </EuiBadge>
  );
};

export const JobStatusBadge = React.memo(JobStatusBadgeComponent);

const JobLink = styled(EuiLink)`
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
`;

const Wrapper = styled.div`
  overflow: hidden;
`;

const MlJobDescriptionComponent: React.FC<{ jobId: string }> = ({ jobId }) => {
  const { jobs } = useSecurityJobs(false);
  const {
    services: { http, ml },
  } = useKibana();
  const jobUrl = useMlHref(ml, http.basePath.get(), {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    pageState: {
      jobId: [jobId],
    },
  });

  const job = jobs.find(({ id }) => id === jobId);

  const jobIdSpan = <span data-test-subj="machineLearningJobId">{jobId}</span>;

  return job != null ? (
    <Wrapper>
      <div>
        <JobLink href={jobUrl} target="_blank">
          {jobIdSpan}
        </JobLink>
        <AuditIcon message={job.auditMessage} />
      </div>
      <JobStatusBadge job={job} />
    </Wrapper>
  ) : (
    jobIdSpan
  );
};

export const MlJobDescription = React.memo(MlJobDescriptionComponent);

const MlJobsDescription: React.FC<{ jobIds: string[] }> = ({ jobIds }) => (
  <>
    {jobIds.map((jobId) => (
      <MlJobDescription key={jobId} jobId={jobId} />
    ))}
  </>
);

export const buildMlJobsDescription = (jobIds: string[], label: string): ListItems => ({
  title: label,
  description: <MlJobsDescription jobIds={jobIds} />,
});
