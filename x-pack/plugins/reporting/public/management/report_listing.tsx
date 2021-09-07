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
  EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Component, default as React, Fragment } from 'react';
import { Subscription } from 'rxjs';
import { ILicense } from '../../../licensing/public';
import { REPORT_TABLE_ID, REPORT_TABLE_ROW_ID, JOB_STATUSES } from '../../common/constants';
import { Poller } from '../../common/poller';
import { durationToNumber } from '../../common/schema_utils';
import { useIlmPolicyStatus } from '../lib/ilm_policy_status_context';
import { Job } from '../lib/job';
import { checkLicense } from '../lib/license_check';
import { useInternalApiClient } from '../lib/reporting_api_client';
import { useKibana } from '../shared_imports';
import { ListingProps as Props } from './';
import { PDF_JOB_TYPE_V2, PNG_JOB_TYPE_V2 } from '../../common/constants';
import {
  IlmPolicyLink,
  MigrateIlmPolicyCallOut,
  ReportDeleteButton,
  ReportDiagnostic,
  ReportDownloadLink,
  ReportInfoButton,
  ReportStatusIndicator,
  ViewInAppLink,
} from './components';

type TableColumn = EuiBasicTableColumn<Job>;

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

class ReportListingUi extends Component<Props, State> {
  private isInitialJobsFetch: boolean;
  private licenseSubscription?: Subscription;
  private mounted?: boolean;
  private poller?: Poller;

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
    this.poller?.stop();

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

  private removeJob = (job: Job) => {
    const { jobs } = this.state;
    const filtered = jobs.filter((j) => j.id !== job.id);
    this.setState((current) => ({ ...current, jobs: filtered }));
  };

  private renderDeleteButton = () => {
    const { selectedJobs } = this.state;
    if (selectedJobs.length === 0) return undefined;

    const performDelete = async () => {
      for (const job of selectedJobs) {
        try {
          await this.props.apiClient.deleteReport(job.id);
          this.removeJob(job);
          this.props.toasts.addSuccess(
            i18n.translate('xpack.reporting.listing.table.deleteConfim', {
              defaultMessage: `The {reportTitle} report was deleted`,
              values: {
                reportTitle: job.title,
              },
            })
          );
        } catch (error) {
          this.props.toasts.addDanger(
            i18n.translate('xpack.reporting.listing.table.deleteFailedErrorMessage', {
              defaultMessage: `The report was not deleted: {error}`,
              values: { error },
            })
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
            i18n.translate('xpack.reporting.listing.table.requestFailedErrorMessage', {
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

  /**
   * Widths like this are not the best, but the auto-layout does not play well with text in links. We can update
   * this with something that works better on all screen sizes. This works for desktop, mobile fallback is provided on a
   * per column basis.
   *
   * Should total 100%.
   */
  private readonly tableColumnWidths = {
    title: '40%',
    type: '10%',
    status: '15%',
    createdAt: '15%',
    createdBy: '10%',
    actions: '10%',
  };

  private renderTable() {
    const { tableColumnWidths } = this;
    const tableColumns: TableColumn[] = [
      {
        field: 'title',
        name: i18n.translate('xpack.reporting.listing.tableColumns.reportTitle', {
          defaultMessage: 'Report',
        }),
        width: tableColumnWidths.title,
        render: (objectTitle: string, job) => {
          return (
            <div data-test-subj="reportingListItemObjectTitle">
              <ReportDownloadLink
                disabled={
                  job.status !== JOB_STATUSES.COMPLETED && job.status !== JOB_STATUSES.WARNINGS
                }
                objectTitle={objectTitle}
                job={job}
              />
            </div>
          );
        },
        mobileOptions: ({
          header: false,
          width: '100%', // This is not recognized by EUI types but has an effect, leaving for now
        } as unknown) as { header: boolean },
      },
      {
        field: 'status',
        width: tableColumnWidths.status,
        name: i18n.translate('xpack.reporting.listing.tableColumns.statusTitle', {
          defaultMessage: 'Status',
        }),
        render: (_status: string, job) => (
          <div data-test-subj="reportJobStatus">
            <ReportStatusIndicator job={job} />
          </div>
        ),
        mobileOptions: {
          show: false,
        },
      },
      {
        field: 'type',
        width: tableColumnWidths.type,
        name: i18n.translate('xpack.reporting.listing.tableColumns.typeTitle', {
          defaultMessage: 'Type',
        }),
        render: (_status: string, job) => (
          <div data-test-subj="reportJobType">{job.objectType}</div>
        ),
        mobileOptions: {
          show: true,
        },
      },
      {
        field: 'created_at',
        width: tableColumnWidths.createdAt,
        name: i18n.translate('xpack.reporting.listing.tableColumns.createdAtTitle', {
          defaultMessage: 'Created at',
        }),
        render: (_createdAt: string, job) => (
          <div data-test-subj="reportJobCreatedAt">{job.getCreatedAtDate()}</div>
        ),
        mobileOptions: {
          show: false,
        },
      },
      {
        field: 'created_by',
        width: tableColumnWidths.createdBy,
        name: i18n.translate('xpack.reporting.listing.tableColumns.createdByTitle', {
          defaultMessage: 'Created by',
        }),
        render: (_createdBy: string, job) => (
          <div data-test-subj="reportJobCreatedAt">{job.getCreatedBy()}</div>
        ),
        mobileOptions: {
          show: false,
        },
      },
      {
        name: i18n.translate('xpack.reporting.listing.tableColumns.actionsTitle', {
          defaultMessage: 'Actions',
        }),
        width: tableColumnWidths.actions,
        actions: [
          {
            render: (job) => {
              return (
                <EuiFlexGroup
                  alignItems="flexEnd"
                  gutterSize="none"
                  data-test-subj="reportJobActions"
                >
                  {[PDF_JOB_TYPE_V2, PNG_JOB_TYPE_V2].some((jobType) => jobType === job.jobtype) ? (
                    <EuiFlexItem grow={false}>
                      <ViewInAppLink job={job} />
                    </EuiFlexItem>
                  ) : null}
                  <EuiFlexItem grow={false}>
                    <ReportInfoButton {...this.props} job={job} />
                  </EuiFlexItem>
                </EuiFlexGroup>
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
              ? i18n.translate('xpack.reporting.listing.table.loadingReportsDescription', {
                  defaultMessage: 'Loading reports',
                })
              : i18n.translate('xpack.reporting.listing.table.noCreatedReportsDescription', {
                  defaultMessage: 'No reports have been created',
                })
          }
          pagination={pagination}
          selection={selection}
          isSelectable={true}
          onChange={this.onTableChange}
          data-test-subj={REPORT_TABLE_ID}
          rowProps={() => ({ 'data-test-subj': REPORT_TABLE_ROW_ID })}
        />
      </Fragment>
    );
  }
}

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
    <ReportListingUi
      {...props}
      apiClient={apiClient}
      capabilities={capabilities}
      ilmPolicyContextValue={ilmPolicyStatusValue}
    />
  );
};
