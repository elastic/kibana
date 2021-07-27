/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import moment from 'moment';
import { Component, default as React, Fragment } from 'react';
import { Subscription } from 'rxjs';
import { ApplicationStart, ToastsSetup } from 'src/core/public';
import { ILicense, LicensingPluginSetup } from '../../../licensing/public';
import { JOB_STATUSES as JobStatuses } from '../../common/constants';
import { Poller } from '../../common/poller';
import { durationToNumber } from '../../common/schema_utils';
import { useIlmPolicyStatus, UseIlmPolicyStatusReturn } from '../lib/ilm_policy_status_context';
import { Job } from '../lib/job';
import { checkLicense } from '../lib/license_check';
import { ReportingAPIClient, useInternalApiClient } from '../lib/reporting_api_client';
import { ClientConfigType } from '../plugin';
import type { SharePluginSetup } from '../shared_imports';
import { useKibana } from '../shared_imports';
import { ReportDeleteButton, ReportDownloadButton, ReportErrorButton, ReportInfoButton } from './';
import { IlmPolicyLink } from './ilm_policy_link';
import { MigrateIlmPolicyCallOut } from './migrate_ilm_policy_callout';
import { ReportDiagnostic } from './report_diagnostic';

export interface Props {
  intl: InjectedIntl;
  apiClient: ReportingAPIClient;
  capabilities: ApplicationStart['capabilities'];
  license$: LicensingPluginSetup['license$'];
  pollConfig: ClientConfigType['poll'];
  redirect: ApplicationStart['navigateToApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  toasts: ToastsSetup;
  urlService: SharePluginSetup['url'];
  ilmPolicyContextValue: UseIlmPolicyStatusReturn;
}

interface State {
  page: number;
  total: number;
  jobs: Job[];
  selectedJobs: Job[];
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
    JobStatuses.WARNINGS,
    i18n.translate('xpack.reporting.jobStatuses.warningText', {
      defaultMessage: 'Completed with warnings',
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
  private isInitialJobsFetch: boolean;
  private licenseSubscription?: Subscription;
  private mounted?: boolean;
  private poller?: any;

  constructor(props: Props) {
    super(props);

    this.state = {
      page: 0,
      total: 0,
      jobs: [],
      selectedJobs: [],
      isLoading: false,
      showLinks: false,
      enableLinks: false,
      badLicenseMessage: '',
    };

    this.isInitialJobsFetch = true;
  }

  public render() {
    const { ilmPolicyContextValue, urlService, navigateToUrl, capabilities } = this.props;
    const ilmLocator = urlService.locators.get('ILM_LOCATOR_ID');
    const hasIlmPolicy = ilmPolicyContextValue.status !== 'policy-not-found';
    const showIlmPolicyLink = Boolean(ilmLocator && hasIlmPolicy);
    return (
      <>
        <EuiPageHeader
          data-test-subj="reportingPageHeader"
          bottomBorder
          pageTitle={
            <FormattedMessage id="xpack.reporting.listing.reportstitle" defaultMessage="Reports" />
          }
          description={
            <FormattedMessage
              id="xpack.reporting.listing.reports.subtitle"
              defaultMessage="Get reports generated in Kibana applications."
            />
          }
        />

        <MigrateIlmPolicyCallOut toasts={this.props.toasts} />

        <EuiSpacer size={'l'} />
        <div>{this.renderTable()}</div>

        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="flexEnd">
          {capabilities?.management?.data?.index_lifecycle_management && (
            <EuiFlexItem grow={false}>
              {ilmPolicyContextValue.isLoading ? (
                <EuiLoadingSpinner />
              ) : (
                showIlmPolicyLink && (
                  <IlmPolicyLink navigateToUrl={navigateToUrl} locator={ilmLocator!} />
                )
              )}
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <ReportDiagnostic apiClient={this.props.apiClient} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }

  public componentWillUnmount() {
    this.mounted = false;
    this.poller.stop();

    if (this.licenseSubscription) {
      this.licenseSubscription.unsubscribe();
    }
  }

  public componentDidMount() {
    this.mounted = true;
    const { pollConfig, license$ } = this.props;
    const pollFrequencyInMillis = durationToNumber(pollConfig.jobsRefresh.interval);
    this.poller = new Poller({
      functionToPoll: () => {
        return this.fetchJobs();
      },
      pollFrequencyInMillis,
      trailing: false,
      continuePollingOnError: true,
      pollFrequencyErrorMultiplier: pollConfig.jobsRefresh.intervalErrorMultiplier,
    });
    this.poller.start();
    this.licenseSubscription = license$.subscribe(this.licenseHandler);
  }

  private licenseHandler = (license: ILicense) => {
    const { enableLinks, showLinks, message: badLicenseMessage } = checkLicense(
      license.check('reporting', 'basic')
    );

    this.setState({
      enableLinks,
      showLinks,
      badLicenseMessage,
    });
  };

  private onSelectionChange = (jobs: Job[]) => {
    this.setState((current) => ({ ...current, selectedJobs: jobs }));
  };

  private removeRecord = (record: Job) => {
    const { jobs } = this.state;
    const filtered = jobs.filter((j) => j.id !== record.id);
    this.setState((current) => ({ ...current, jobs: filtered }));
  };

  private renderDeleteButton = () => {
    const { selectedJobs } = this.state;
    if (selectedJobs.length === 0) return undefined;

    const performDelete = async () => {
      for (const record of selectedJobs) {
        try {
          await this.props.apiClient.deleteReport(record.id);
          this.removeRecord(record);
          this.props.toasts.addSuccess(
            this.props.intl.formatMessage(
              {
                id: 'xpack.reporting.listing.table.deleteConfim',
                defaultMessage: `The {reportTitle} report was deleted`,
              },
              { reportTitle: record.title }
            )
          );
        } catch (error) {
          this.props.toasts.addDanger(
            this.props.intl.formatMessage(
              {
                id: 'xpack.reporting.listing.table.deleteFailedErrorMessage',
                defaultMessage: `The report was not deleted: {error}`,
              },
              { error }
            )
          );
          throw error;
        }
      }

      // Since the contents of the table have changed, we must reset the pagination
      // and re-fetch. Otherwise, the Nth page we are on could be empty of jobs.
      this.setState(() => ({ page: 0 }), this.fetchJobs);
    };

    return (
      <ReportDeleteButton
        jobsToDelete={selectedJobs}
        performDelete={performDelete}
        {...this.props}
      />
    );
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

    let jobs: Job[];
    let total: number;
    try {
      jobs = await this.props.apiClient.list(this.state.page);
      total = await this.props.apiClient.total();
      this.isInitialJobsFetch = false;
    } catch (fetchError) {
      if (!this.licenseAllowsToShowThisPage()) {
        this.props.toasts.addDanger(this.state.badLicenseMessage);
        this.props.redirect('management');
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
        jobs,
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

  private renderTable() {
    const { intl } = this.props;

    const tableColumns = [
      {
        field: 'title',
        name: intl.formatMessage({
          id: 'xpack.reporting.listing.tableColumns.reportTitle',
          defaultMessage: 'Report',
        }),
        render: (objectTitle: string, record: Job) => {
          return (
            <div data-test-subj="reportingListItemObjectTitle">
              <div>{objectTitle}</div>
              <EuiText size="s">
                <EuiTextColor color="subdued">{record.objectType}</EuiTextColor>
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
                  id="xpack.reporting.listing.tableValue.statusDetail.pendingStatusReachedText"
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
                  id="xpack.reporting.listing.tableValue.statusDetail.maxSizeReachedText"
                  defaultMessage=" - Max size reached"
                />
              </span>
            );
          }

          let warnings;
          if (record.warnings) {
            warnings = (
              <EuiText size="s">
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.reporting.listing.tableValue.statusDetail.warningsText"
                    defaultMessage="Errors occurred: see job info for details."
                  />
                </EuiTextColor>
              </EuiText>
            );
          }

          let statusTimestamp;
          if (status === JobStatuses.PROCESSING && record.started_at) {
            statusTimestamp = this.formatDate(record.started_at);
          } else if (
            record.completed_at &&
            ([
              JobStatuses.COMPLETED,
              JobStatuses.FAILED,
              JobStatuses.WARNINGS,
            ] as string[]).includes(status)
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
                  id="xpack.reporting.listing.tableValue.statusDetail.statusTimestampText"
                  defaultMessage="{statusLabel} at {statusTimestamp}"
                  values={{
                    statusLabel,
                    statusTimestamp: <span className="eui-textNoWrap">{statusTimestamp}</span>,
                  }}
                />
                {maxSizeReached}
                {warnings}
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
                  <ReportDownloadButton {...this.props} record={record} />
                  <ReportErrorButton {...this.props} record={record} />
                  <ReportInfoButton {...this.props} jobId={record.id} />
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

    const selection = {
      itemId: 'id',
      onSelectionChange: this.onSelectionChange,
    };

    return (
      <Fragment>
        {this.state.selectedJobs.length > 0 && (
          <Fragment>
            <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="m">
              <EuiFlexItem grow={false}>{this.renderDeleteButton()}</EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
          </Fragment>
        )}
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.reporting.listing.table.captionDescription', {
            defaultMessage: 'Reports generated in Kibana applications',
          })}
          itemId="id"
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
          selection={selection}
          isSelectable={true}
          onChange={this.onTableChange}
          data-test-subj="reportJobListing"
        />
      </Fragment>
    );
  }
}

const PrivateReportListing = injectI18n(ReportListingUi);

export const ReportListing = (
  props: Omit<Props, 'ilmPolicyContextValue' | 'intl' | 'apiClient' | 'capabilities'>
) => {
  const ilmPolicyStatusValue = useIlmPolicyStatus();
  const { apiClient } = useInternalApiClient();
  const {
    services: {
      application: { capabilities },
    },
  } = useKibana();
  return (
    <PrivateReportListing
      {...props}
      apiClient={apiClient}
      capabilities={capabilities}
      ilmPolicyContextValue={ilmPolicyStatusValue}
    />
  );
};
