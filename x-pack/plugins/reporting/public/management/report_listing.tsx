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
import { Component, default as React, Fragment } from 'react';
import { Subscription } from 'rxjs';
import { ApplicationStart, ToastsSetup } from 'src/core/public';
import { ILicense, LicensingPluginSetup } from '../../../licensing/public';
import { Poller } from '../../common/poller';
import { durationToNumber } from '../../common/schema_utils';
import { useIlmPolicyStatus, UseIlmPolicyStatusReturn } from '../lib/ilm_policy_status_context';
import { Job } from '../lib/job';
import { checkLicense } from '../lib/license_check';
import { ReportingAPIClient, useInternalApiClient } from '../lib/reporting_api_client';
import { ClientConfigType } from '../plugin';
import type { SharePluginSetup } from '../shared_imports';
import { ReportDeleteButton } from './report_delete_button';
import { ReportDownloadButton } from './report_download_button';
import { ReportInfoButton } from './report_info_button';
import { ReportErrorButton } from './report_error_button';
import { ReportWarningsButton } from './report_warnings_button';
import { IlmPolicyLink } from './ilm_policy_link';
import { MigrateIlmPolicyCallOut } from './migrate_ilm_policy_callout';
import { ReportDiagnostic } from './report_diagnostic';

export interface Props {
  intl: InjectedIntl;
  apiClient: ReportingAPIClient;
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
    const { ilmPolicyContextValue, urlService, navigateToUrl } = this.props;
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
        {this.renderTable()}

        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            {ilmPolicyContextValue.isLoading ? (
              <EuiLoadingSpinner />
            ) : (
              showIlmPolicyLink && (
                <IlmPolicyLink navigateToUrl={navigateToUrl} locator={ilmLocator!} />
              )
            )}
          </EuiFlexItem>
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
            this.props.intl.formatMessage(
              {
                id: 'xpack.reporting.listing.table.deleteConfim',
                defaultMessage: `The {reportTitle} report was deleted`,
              },
              { reportTitle: job.title }
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

  private renderTable() {
    const { intl } = this.props;

    const tableColumns = [
      {
        field: 'title',
        name: intl.formatMessage({
          id: 'xpack.reporting.listing.tableColumns.reportTitle',
          defaultMessage: 'Report',
        }),
        render: (objectTitle: string, job: Job) => {
          return (
            <div data-test-subj="reportingListItemObjectTitle">
              <div>{objectTitle}</div>
              <EuiText size="s">
                <EuiTextColor color="subdued">{job.objectType}</EuiTextColor>
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
        render: (_createdAt: string, job: Job) => job.getCreatedAtLabel(),
      },
      {
        field: 'status',
        name: intl.formatMessage({
          id: 'xpack.reporting.listing.tableColumns.statusTitle',
          defaultMessage: 'Status',
        }),
        render: (_status: string, job: Job) => job.getStatusLabel(),
      },
      {
        name: intl.formatMessage({
          id: 'xpack.reporting.listing.tableColumns.actionsTitle',
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: (job: Job) => {
              return (
                <div>
                  <ReportInfoButton {...this.props} job={job} />
                  <ReportWarningsButton {...this.props} job={job} />
                  <ReportErrorButton {...this.props} job={job} />
                  <ReportDownloadButton {...this.props} job={job} />
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
        {this.state.selectedJobs.length > 0 ? this.renderDeleteButton() : null}
      </Fragment>
    );
  }
}

const PrivateReportListing = injectI18n(ReportListingUi);

export const ReportListing = (
  props: Omit<Props, 'ilmPolicyContextValue' | 'intl' | 'apiClient'>
) => {
  const ilmPolicyStatusValue = useIlmPolicyStatus();
  const { apiClient } = useInternalApiClient();
  return (
    <PrivateReportListing
      {...props}
      apiClient={apiClient}
      ilmPolicyContextValue={ilmPolicyStatusValue}
    />
  );
};
