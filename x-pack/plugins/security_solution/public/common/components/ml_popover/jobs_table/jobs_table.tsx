/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

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
import { useBasePath } from '../../../lib/kibana';
import * as i18n from './translations';
import { JobSwitch } from './job_switch';
import { SiemJob } from '../types';

const JobNameWrapper = styled.div`
  margin: 5px 0;
`;

JobNameWrapper.displayName = 'JobNameWrapper';

// TODO: Use SASS mixin @include EuiTextTruncate when we switch from styled components
const truncateThreshold = 200;

const getJobsTableColumns = (
  isLoading: boolean,
  onJobStateChange: (job: SiemJob, latestTimestampMs: number, enable: boolean) => Promise<void>,
  basePath: string
) => [
  {
    name: i18n.COLUMN_JOB_NAME,
    render: ({ id, description }: SiemJob) => (
      <JobNameWrapper>
        <EuiLink
          data-test-subj="jobs-table-link"
          href={`${basePath}/app/ml#/jobs?mlManagement=(jobId:${encodeURI(id)})`}
          target="_blank"
        >
          <EuiText size="s">{id}</EuiText>
        </EuiLink>
        <EuiText color="subdued" size="xs">
          {description.length > truncateThreshold
            ? `${description.substring(0, truncateThreshold)}...`
            : description}
        </EuiText>
      </JobNameWrapper>
    ),
  },
  {
    name: i18n.COLUMN_GROUPS,
    render: ({ groups }: SiemJob) => (
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
    render: (job: SiemJob) =>
      job.isCompatible ? (
        <JobSwitch job={job} isSiemJobsLoading={isLoading} onJobStateChange={onJobStateChange} />
      ) : (
        <EuiIcon aria-label="Warning" size="s" type="alert" color="warning" />
      ),
    align: CENTER_ALIGNMENT,
    width: '80px',
  } as const,
];

const getPaginatedItems = (items: SiemJob[], pageIndex: number, pageSize: number): SiemJob[] =>
  items.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

export interface JobTableProps {
  isLoading: boolean;
  jobs: SiemJob[];
  onJobStateChange: (job: SiemJob, latestTimestampMs: number, enable: boolean) => Promise<void>;
}

export const JobsTableComponent = ({ isLoading, jobs, onJobStateChange }: JobTableProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const basePath = useBasePath();
  const pageSize = 5;

  const pagination = {
    hidePerPageOptions: true,
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
      noItemsMessage={<NoItemsMessage />}
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

export const NoItemsMessage = React.memo(() => (
  <EuiEmptyPrompt
    title={<h3>{i18n.NO_ITEMS_TEXT}</h3>}
    titleSize="xs"
    actions={
      <EuiButton
        href="ml#/jobs/new_job/step/index_or_search"
        iconType="popout"
        iconSide="right"
        size="s"
        target="_blank"
      >
        {i18n.CREATE_CUSTOM_JOB}
      </EuiButton>
    }
  />
));

NoItemsMessage.displayName = 'NoItemsMessage';
