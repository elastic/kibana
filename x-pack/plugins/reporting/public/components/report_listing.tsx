/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Remove once typescript definitions are in EUI
declare module '@elastic/eui' {
  export const EuiBasicTable: React.SFC<any>;
}

import moment from 'moment';
import React, { Component } from 'react';
import chrome from 'ui/chrome';
import { toastNotifications } from 'ui/notify';
import { Poller } from '../../../../common/poller';
import { downloadReport } from '../lib/download_report';
import { jobQueueClient, JobQueueEntry } from '../lib/job_queue_client';
import { ReportErrorButton } from './report_error_button';

import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';

interface Job {
  id: string;
  type: string;
  object_type: string;
  object_title: string;
  created_by?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  status: string;
  max_size_reached: boolean;
}

interface Props {
  badLicenseMessage: string;
  showLinks: boolean;
  enableLinks: boolean;
  redirect: (url: string) => void;
}

interface State {
  page: number;
  total: number;
  jobs: Job[];
  isLoading: boolean;
}

export class ReportListing extends Component<Props, State> {
  private mounted?: boolean;
  private poller?: any;
  private isInitialJobsFetch: boolean;

  constructor(props: Props) {
    super(props);

    this.state = {
      page: 0,
      total: 0,
      jobs: [],
      isLoading: false,
    };

    this.isInitialJobsFetch = true;
  }

  public render() {
    return (
      <EuiPage>
        <EuiPageBody restrictWidth>
          <EuiPageContent horizontalPosition="center">
            <EuiTitle>
              <h1>Reports</h1>
            </EuiTitle>
            {this.renderTable()}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  public componentWillUnmount() {
    this.mounted = false;
    this.poller.stop();
  }

  public componentDidMount() {
    this.mounted = true;
    const { jobsRefresh } = chrome.getInjected('reportingPollConfig');
    this.poller = new Poller({
      functionToPoll: () => {
        return this.fetchJobs();
      },
      pollFrequencyInMillis: jobsRefresh.interval,
      trailing: false,
      continuePollingOnError: true,
      pollFrequencyErrorMultiplier: jobsRefresh.intervalErrorMultiplier,
    });
    this.poller.start();
  }

  private renderTable() {
    const tableColumns = [
      {
        field: 'object_title',
        name: 'Report',
        render: (objectTitle: string, record: Job) => {
          return (
            <div>
              <div>{objectTitle}</div>
              <EuiText size="s">
                <EuiTextColor color="subdued">{record.object_type}</EuiTextColor>
              </EuiText>
            </div>
          );
        },
      },
      {
        field: 'created_at',
        name: 'Created at',
        render: (createdAt: string, record: Job) => {
          if (record.created_by) {
            return (
              <div>
                <div>{this.formatDate(createdAt)}</div>
                <span>{record.created_by}</span>
              </div>
            );
          }
          return this.formatDate(createdAt);
        },
      },
      {
        field: 'status',
        name: 'Status',
        render: (status: string, record: Job) => {
          let maxSizeReached;
          if (record.max_size_reached) {
            maxSizeReached = <span> - max size reached</span>;
          }
          let statusTimestamp;
          if (status === 'processing' && record.started_at) {
            statusTimestamp = this.formatDate(record.started_at);
          } else if (record.completed_at && (status === 'completed' || status === 'failed')) {
            statusTimestamp = this.formatDate(record.completed_at);
          }
          return (
            <div>
              {status}
              {' at '}
              <span className="eui-textNoWrap">{statusTimestamp}</span>
              {maxSizeReached}
            </div>
          );
        },
      },
      {
        name: 'Actions',
        actions: [
          {
            render: (record: Job) => {
              return (
                <div>
                  {this.renderDownloadButton(record)}
                  {this.renderReportErrorButton(record)}
                </div>
              );
            },
          },
        ],
      },
    ];

    const pagination = {
      pageIndex: this.state.page,
      pageSize: 10,
      totalItemCount: this.state.total,
      hidePerPageOptions: true,
    };

    return (
      <EuiBasicTable
        itemId={'id'}
        items={this.state.jobs}
        loading={this.state.isLoading}
        columns={tableColumns}
        noItemsMessage={this.state.isLoading ? 'Loading reports' : 'No reports have been created'}
        pagination={pagination}
        onChange={this.onTableChange}
      />
    );
  }

  private renderDownloadButton = (record: Job) => {
    if (record.status !== 'completed') {
      return;
    }

    const button = (
      <EuiButtonIcon
        onClick={() => downloadReport(record.id)}
        iconType="importAction"
        aria-label="Download report"
      />
    );

    if (record.max_size_reached) {
      return (
        <EuiToolTip position="top" content="Max size reached, contains partial data.">
          {button}
        </EuiToolTip>
      );
    }

    return button;
  };

  private renderReportErrorButton = (record: Job) => {
    if (record.status !== 'failed') {
      return;
    }

    return <ReportErrorButton jobId={record.id} />;
  };

  private onTableChange = ({ page }: { page: { index: number } }) => {
    const { index: pageIndex } = page;

    this.setState(
      {
        page: pageIndex,
      },
      this.fetchJobs
    );
  };

  private fetchJobs = async () => {
    // avoid page flicker when poller is updating table - only display loading screen on first load
    if (this.isInitialJobsFetch) {
      this.setState({ isLoading: true });
    }

    let jobs: JobQueueEntry[];
    let total: number;
    try {
      jobs = await jobQueueClient.list(this.state.page);
      total = await jobQueueClient.total();
      this.isInitialJobsFetch = false;
    } catch (kfetchError) {
      if (!this.licenseAllowsToShowThisPage()) {
        toastNotifications.addDanger(this.props.badLicenseMessage);
        this.props.redirect('/management');
        return;
      }

      if (kfetchError.res.status !== 401 && kfetchError.res.status !== 403) {
        toastNotifications.addDanger(kfetchError.res.statusText || 'Request failed');
      }
      if (this.mounted) {
        this.setState({ isLoading: false, jobs: [], total: 0 });
      }
      return;
    }

    if (this.mounted) {
      this.setState({
        isLoading: false,
        total,
        jobs: jobs.map((job: JobQueueEntry) => {
          return {
            id: job._id,
            type: job._source.jobtype,
            object_type: job._source.payload.type,
            object_title: job._source.payload.title,
            created_by: job._source.created_by,
            created_at: job._source.created_at,
            started_at: job._source.started_at,
            completed_at: job._source.completed_at,
            status: job._source.status,
            max_size_reached: job._source.output ? job._source.output.max_size_reached : false,
          };
        }),
      });
    }
  };

  private licenseAllowsToShowThisPage = () => {
    return this.props.showLinks && this.props.enableLinks;
  };

  private formatDate(timestamp: string) {
    try {
      return moment(timestamp).format('YYYY-MM-DD @ hh:mm A');
    } catch (error) {
      // ignore parse error and display unformatted value
      return timestamp;
    }
  }
}
