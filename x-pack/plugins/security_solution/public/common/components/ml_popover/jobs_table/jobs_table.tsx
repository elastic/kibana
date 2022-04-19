/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  CENTER_ALIGNMENT,
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
} from '@elastic/eui';

import styled from 'styled-components';
import { useMlHref, ML_PAGES } from '@kbn/ml-plugin/public';
import { useBasePath, useKibana } from '../../../lib/kibana';
import * as i18n from './translations';
import { JobSwitch } from './job_switch';
import { SecurityJob } from '../types';

const JobNameWrapper = styled.div`
  margin: 5px 0;
`;

JobNameWrapper.displayName = 'JobNameWrapper';

// TODO: Use SASS mixin @include EuiTextTruncate when we switch from styled components
const truncateThreshold = 200;

interface JobNameProps {
  id: string;
  description: string;
  basePath: string;
}

const JobName = ({ id, description, basePath }: JobNameProps) => {
  const {
    services: { ml },
  } = useKibana();

  const jobUrl = useMlHref(ml, basePath, {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    pageState: {
      jobId: id,
    },
  });

  return (
    <JobNameWrapper>
      <EuiText size="s">
        <EuiLink data-test-subj="jobs-table-link" href={jobUrl} target="_blank">
          {id}
        </EuiLink>
      </EuiText>
      <EuiText color="subdued" size="xs">
        {description.length > truncateThreshold
          ? `${description.substring(0, truncateThreshold)}...`
          : description}
      </EuiText>
    </JobNameWrapper>
  );
};
const getJobsTableColumns = (
  isLoading: boolean,
  onJobStateChange: (job: SecurityJob, latestTimestampMs: number, enable: boolean) => Promise<void>,
  basePath: string
) => [
  {
    name: i18n.COLUMN_JOB_NAME,
    render: ({ id, description }: SecurityJob) => (
      <JobName id={id} description={description} basePath={basePath} />
    ),
  },
  {
    name: i18n.COLUMN_GROUPS,
    render: ({ groups }: SecurityJob) => (
      <EuiFlexGroup wrap responsive={true} gutterSize="xs">
        {groups.map((group) => (
          <EuiFlexItem grow={false} key={group}>
            <EuiBadge color={'hollow'}>{group}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    ),
    width: '140px',
  },

  {
    name: i18n.COLUMN_RUN_JOB,
    render: (job: SecurityJob) =>
      job.isCompatible ? (
        <JobSwitch
          job={job}
          isSecurityJobsLoading={isLoading}
          onJobStateChange={onJobStateChange}
        />
      ) : (
        <EuiIcon aria-label="Warning" size="s" type="alert" color="warning" />
      ),
    align: CENTER_ALIGNMENT,
    width: '80px',
  } as const,
];

const getPaginatedItems = (
  items: SecurityJob[],
  pageIndex: number,
  pageSize: number
): SecurityJob[] => items.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

export interface JobTableProps {
  isLoading: boolean;
  jobs: SecurityJob[];
  onJobStateChange: (job: SecurityJob, latestTimestampMs: number, enable: boolean) => Promise<void>;
}

export const JobsTableComponent = ({ isLoading, jobs, onJobStateChange }: JobTableProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const basePath = useBasePath();
  const pageSize = 5;

  const pagination = {
    showPerPageOptions: false,
    pageIndex,
    pageSize,
    totalItemCount: jobs.length,
  };

  useEffect(() => {
    setPageIndex(0);
  }, [jobs.length]);

  return (
    <EuiBasicTable
      data-test-subj="jobs-table"
      columns={getJobsTableColumns(isLoading, onJobStateChange, basePath)}
      items={getPaginatedItems(jobs, pageIndex, pageSize)}
      loading={isLoading}
      noItemsMessage={<NoItemsMessage basePath={basePath} />}
      pagination={pagination}
      responsive={false}
      onChange={({ page }: { page: { index: number } }) => {
        setPageIndex(page.index);
      }}
    />
  );
};

JobsTableComponent.displayName = 'JobsTableComponent';

export const JobsTable = React.memo(JobsTableComponent);

JobsTable.displayName = 'JobsTable';

export const NoItemsMessage = React.memo(({ basePath }: { basePath: string }) => {
  const {
    services: { ml },
  } = useKibana();

  const createNewAnomalyDetectionJoUrl = useMlHref(ml, basePath, {
    page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX,
  });

  return (
    <EuiEmptyPrompt
      title={<h3>{i18n.NO_ITEMS_TEXT}</h3>}
      titleSize="xs"
      actions={
        <EuiButton
          href={createNewAnomalyDetectionJoUrl}
          iconType="popout"
          iconSide="right"
          size="s"
          target="_blank"
        >
          {i18n.CREATE_CUSTOM_JOB}
        </EuiButton>
      }
    />
  );
});

NoItemsMessage.displayName = 'NoItemsMessage';
