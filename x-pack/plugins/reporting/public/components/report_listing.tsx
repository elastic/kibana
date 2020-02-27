/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import moment from 'moment';
import { get } from 'lodash';

import React, { Component } from 'react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiPageContent,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';

import { ToastsSetup } from '../../';
import { LicensingPluginSetup, LICENSE_CHECK_STATE } from '../../../licensing/public';
import { Poller } from '../../common/poller';
import { JobStatuses, JOB_COMPLETION_NOTIFICATIONS_POLLER_CONFIG } from '../../constants';
import { JobQueueClient, JobQueueEntry } from '../lib/job_queue_client';
import { ReportErrorButton } from './report_error_button';
import { ReportInfoButton } from './report_info_button';

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
  statusLabel: string;
  max_size_reached: boolean;
  attempts: number;
  max_attempts: number;
  csv_contains_formulas: boolean;
}

interface Props {
  redirect: (url: string) => void;
  intl: InjectedIntl;
  // @TODO: Get right types here
  toasts: ToastsSetup;
  jobQueueClient: JobQueueClient;
  license$: LicensingPluginSetup['license$'];
}

interface State {
  page: number;
  total: number;
  jobs: Job[];
  isLoading: boolean;
  showLinks: boolean;
  enableLinks: boolean;
  badLicenseMessage: string;
}

const jobStatusLabelsMap = new Map<JobStatuses, string>([
  [
    JobStatuses.PENDING,
    i18n.translate('xpack.reporting.jobStatuses.pendingText', {
      defaultMessage: 'Pending',
    }),
  ],
  [
    JobStatuses.PROCESSING,
    i18n.translate('xpack.reporting.jobStatuses.processingText', {
      defaultMessage: 'Processing',
    }),
  ],
  [
    JobStatuses.COMPLETED,
    i18n.translate('xpack.reporting.jobStatuses.completedText', {
      defaultMessage: 'Completed',
    }),
  ],
  [
    JobStatuses.FAILED,
    i18n.translate('xpack.reporting.jobStatuses.failedText', {
      defaultMessage: 'Failed',
    }),
  ],
  [
    JobStatuses.CANCELLED,
    i18n.translate('xpack.reporting.jobStatuses.cancelledText', {
      defaultMessage: 'Cancelled',
    }),
  ],
]);

class ReportListingUi extends Component<Props, State> {
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
      showLinks: false,
      enableLinks: false,
      badLicenseMessage: '',
    };

    this.isInitialJobsFetch = true;

    this.props.license$.subscribe(license => {
      const { state, message } = license.check('reporting', 'basic');
      const enableLinks = state === LICENSE_CHECK_STATE.Valid;
      const showLinks = enableLinks && license.getFeature('csv').isAvailable;

      this.setState({
        enableLinks,
        showLinks,
        badLicenseMessage: message || '',
      });
    });
  }

  public render() {
    return (
      <EuiPageContent horizontalPosition="center" className="euiPageBody--restrictWidth-default">
        <EuiTitle>
          <h1>
            <FormattedMessage id="xpack.reporting.listing.reportstitle" defaultMessage="Reports" />
          </h1>
        </EuiTitle>
        <EuiText color="subdued" size="s">
          <p>
            <FormattedMessage
              id="xpack.reporting.listing.reports.subtitle"
              defaultMessage="Find reports generated in Kibana applications here"
            />
          </p>
        </EuiText>
        <EuiSpacer />
        {this.renderTable()}
      </EuiPageContent>
    );
  }

  public componentWillUnmount() {
    this.mounted = false;
    this.poller.stop();
  }

  public componentDidMount() {
    this.mounted = true;
    this.poller = new Poller({
      functionToPoll: () => {
        return this.fetchJobs();
      },
      pollFrequencyInMillis:
        JOB_COMPLETION_NOTIFICATIONS_POLLER_CONFIG.jobCompletionNotifier.interval,
      trailing: false,
      continuePollingOnError: true,
      pollFrequencyErrorMultiplier:
        JOB_COMPLETION_NOTIFICATIONS_POLLER_CONFIG.jobCompletionNotifier.intervalErrorMultiplier,
    });
    this.poller.start();
  }

  private renderTable() {
    const { intl } = this.props;

    const tableColumns = [
      {
        field: 'object_title',
        name: intl.formatMessage({
          id: 'xpack.reporting.listing.tableColumns.reportTitle',
          defaultMessage: 'Report',
        }),
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
        name: intl.formatMessage({
          id: 'xpack.reporting.listing.tableColumns.createdAtTitle',
          defaultMessage: 'Created at',
        }),
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
        name: intl.formatMessage({
          id: 'xpack.reporting.listing.tableColumns.statusTitle',
          defaultMessage: 'Status',
        }),
        render: (status: string, record: Job) => {
          if (status === 'pending') {
            return (
              <div>
                <FormattedMessage
                  id="xpack.reporting.listing.tableValue.createdAtDetail.pendingStatusReachedText"
                  defaultMessage="Pending - waiting for job to be processed"
                />
              </div>
            );
          }

          let maxSizeReached;
          if (record.max_size_reached) {
            maxSizeReached = (
              <span>
                <FormattedMessage
                  id="xpack.reporting.listing.tableValue.createdAtDetail.maxSizeReachedText"
                  defaultMessage=" - Max size reached"
                />
              </span>
            );
          }

          let statusTimestamp;
          if (status === JobStatuses.PROCESSING && record.started_at) {
            statusTimestamp = this.formatDate(record.started_at);
          } else if (
            record.completed_at &&
            (status === JobStatuses.COMPLETED || status === JobStatuses.FAILED)
          ) {
            statusTimestamp = this.formatDate(record.completed_at);
          }

          let statusLabel = jobStatusLabelsMap.get(status as JobStatuses) || status;

          if (status === JobStatuses.PROCESSING) {
            statusLabel = statusLabel + ` (attempt ${record.attempts} of ${record.max_attempts})`;
          }

          if (statusTimestamp) {
            return (
              <div>
                <FormattedMessage
                  id="xpack.reporting.listing.tableValue.createdAtDetail.statusTimestampText"
                  defaultMessage="{statusLabel} at {statusTimestamp}"
                  values={{
                    statusLabel,
                    statusTimestamp: <span className="eui-textNoWrap">{statusTimestamp}</span>,
                  }}
                />
                {maxSizeReached}
              </div>
            );
          }

          // unknown status
          return (
            <div>
              {statusLabel}
              {maxSizeReached}
            </div>
          );
        },
      },
      {
        name: intl.formatMessage({
          id: 'xpack.reporting.listing.tableColumns.actionsTitle',
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: (record: Job) => {
              return (
                <div>
                  {this.renderDownloadButton(record)}
                  {this.renderReportErrorButton(record)}
                  {this.renderInfoButton(record)}
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
        noItemsMessage={
          this.state.isLoading
            ? intl.formatMessage({
                id: 'xpack.reporting.listing.table.loadingReportsDescription',
                defaultMessage: 'Loading reports',
              })
            : intl.formatMessage({
                id: 'xpack.reporting.listing.table.noCreatedReportsDescription',
                defaultMessage: 'No reports have been created',
              })
        }
        pagination={pagination}
        onChange={this.onTableChange}
        data-test-subj="reportJobListing"
      />
    );
  }

  private renderDownloadButton = (record: Job) => {
    if (record.status !== JobStatuses.COMPLETED) {
      return;
    }

    const { intl } = this.props;
    const button = (
      <EuiButtonIcon
        onClick={() => this.props.jobQueueClient.downloadReport(record.id)}
        iconType="importAction"
        aria-label={intl.formatMessage({
          id: 'xpack.reporting.listing.table.downloadReportAriaLabel',
          defaultMessage: 'Download report',
        })}
      />
    );

    if (record.csv_contains_formulas) {
      return (
        <EuiToolTip
          position="top"
          content={intl.formatMessage({
            id: 'xpack.reporting.listing.table.csvContainsFormulas',
            defaultMessage:
              'Your CSV contains characters which spreadsheet applications can interpret as formulas.',
          })}
        >
          {button}
        </EuiToolTip>
      );
    }

    if (record.max_size_reached) {
      return (
        <EuiToolTip
          position="top"
          content={intl.formatMessage({
            id: 'xpack.reporting.listing.table.maxSizeReachedTooltip',
            defaultMessage: 'Max size reached, contains partial data.',
          })}
        >
          {button}
        </EuiToolTip>
      );
    }

    return button;
  };

  private renderReportErrorButton = (record: Job) => {
    if (record.status !== JobStatuses.FAILED) {
      return;
    }

    return <ReportErrorButton jobQueueClient={this.props.jobQueueClient} jobId={record.id} />;
  };

  private renderInfoButton = (record: Job) => {
    return <ReportInfoButton jobQueueClient={this.props.jobQueueClient} jobId={record.id} />;
  };

  private onTableChange = ({ page }: { page: { index: number } }) => {
    const { index: pageIndex } = page;
    this.setState(() => ({ page: pageIndex }), this.fetchJobs);
  };

  private fetchJobs = async () => {
    // avoid page flicker when poller is updating table - only display loading screen on first load
    if (this.isInitialJobsFetch) {
      this.setState(() => ({ isLoading: true }));
    }

    let jobs: JobQueueEntry[];
    let total: number;
    try {
      jobs = await this.props.jobQueueClient.list(this.state.page);
      total = await this.props.jobQueueClient.total();
      this.isInitialJobsFetch = false;
    } catch (fetchError) {
      if (!this.licenseAllowsToShowThisPage()) {
        this.props.toasts.addDanger(this.state.badLicenseMessage);
        this.props.redirect('kibana#/management');
        return;
      }

      if (fetchError.message === 'Failed to fetch') {
        this.props.toasts.addDanger(
          fetchError.message ||
            this.props.intl.formatMessage({
              id: 'xpack.reporting.listing.table.requestFailedErrorMessage',
              defaultMessage: 'Request failed',
            })
        );
      }
      if (this.mounted) {
        this.setState(() => ({ isLoading: false, jobs: [], total: 0 }));
      }
      return;
    }

    if (this.mounted) {
      this.setState(() => ({
        isLoading: false,
        total,
        jobs: jobs.map(
          (job: JobQueueEntry): Job => {
            const { _source: source } = job;
            return {
              id: job._id,
              type: source.jobtype,
              object_type: source.payload.objectType,
              object_title: source.payload.title,
              created_by: source.created_by,
              created_at: source.created_at,
              started_at: source.started_at,
              completed_at: source.completed_at,
              status: source.status,
              statusLabel: jobStatusLabelsMap.get(source.status as JobStatuses) || source.status,
              max_size_reached: source.output ? source.output.max_size_reached : false,
              attempts: source.attempts,
              max_attempts: source.max_attempts,
              csv_contains_formulas: get(source, 'output.csv_contains_formulas'),
            };
          }
        ),
      }));
    }
  };

  private licenseAllowsToShowThisPage = () => {
    return this.state.showLinks && this.state.enableLinks;
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

export const ReportListing = injectI18n(ReportListingUi);
