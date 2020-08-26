/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiCallOut,
} from '@elastic/eui';

import { withKibana } from '../../../../../../../src/plugins/kibana_react/public';

import { extractQueryParams } from '../../../shared_imports';
import { getRouterLinkProps, listBreadcrumb } from '../../services';
import { JobTable } from './job_table';
import { DetailPanel } from './detail_panel';

const REFRESH_RATE_MS = 30000;

export class JobListUi extends Component {
  static propTypes = {
    loadJobs: PropTypes.func,
    refreshJobs: PropTypes.func,
    openDetailPanel: PropTypes.func,
    hasJobs: PropTypes.bool,
    isLoading: PropTypes.bool,
  };

  static getDerivedStateFromProps(props) {
    const {
      openDetailPanel,
      history: {
        location: { search },
      },
    } = props;

    const { job: jobId } = extractQueryParams(search);

    // Show deeplinked job whenever jobs get loaded or the URL changes.
    if (jobId != null) {
      openDetailPanel(jobId);
    }

    return null;
  }

  constructor(props) {
    super(props);

    props.loadJobs();

    props.kibana.services.setBreadcrumbs([listBreadcrumb]);

    this.state = {};
  }

  componentDidMount() {
    this.interval = setInterval(this.props.refreshJobs, REFRESH_RATE_MS);
  }

  componentWillUnmount() {
    clearInterval(this.interval);

    // Close the panel, otherwise it will default to already being open when we navigate back to
    // this page.
    this.props.closeDetailPanel();
  }

  getHeaderSection() {
    return (
      <EuiPageContentHeaderSection data-test-subj="jobListPageHeader">
        <EuiTitle size="l">
          <h1>
            <FormattedMessage id="xpack.rollupJobs.jobListTitle" defaultMessage="Rollup Jobs" />
          </h1>
        </EuiTitle>
      </EuiPageContentHeaderSection>
    );
  }

  renderNoPermission() {
    const title = i18n.translate('xpack.rollupJobs.jobList.noPermissionTitle', {
      defaultMessage: 'Permission error',
    });
    return (
      <Fragment>
        {this.getHeaderSection()}
        <EuiSpacer size="m" />
        <EuiCallOut
          data-test-subj="jobListNoPermission"
          title={title}
          color="warning"
          iconType="help"
        >
          <FormattedMessage
            id="xpack.rollupJobs.jobList.noPermissionText"
            defaultMessage="You do not have permission to view or add rollup jobs."
          />
        </EuiCallOut>
      </Fragment>
    );
  }

  renderError(error) {
    // We can safely depend upon the shape of this error coming from http service, because we
    // handle unexpected error shapes in the API action.
    const { statusCode, error: errorString } = error.body;

    const title = i18n.translate('xpack.rollupJobs.jobList.loadingErrorTitle', {
      defaultMessage: 'Error loading rollup jobs',
    });
    return (
      <Fragment>
        {this.getHeaderSection()}
        <EuiSpacer size="m" />
        <EuiCallOut data-test-subj="jobListError" title={title} color="danger" iconType="alert">
          {statusCode} {errorString}
        </EuiCallOut>
      </Fragment>
    );
  }

  renderEmpty() {
    return (
      <EuiEmptyPrompt
        data-test-subj="jobListEmptyPrompt"
        iconType="indexRollupApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.rollupJobs.jobList.emptyPromptTitle"
              defaultMessage="Create your first rollup job"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.rollupJobs.jobList.emptyPromptDescription"
                defaultMessage="Rollup jobs summarize and store historical data in a smaller index
                  for future analysis."
              />
            </p>
          </Fragment>
        }
        actions={
          <EuiButton
            data-test-subj="createRollupJobButton"
            {...getRouterLinkProps(`/create`)}
            fill
            iconType="plusInCircle"
          >
            <FormattedMessage
              id="xpack.rollupJobs.jobList.emptyPrompt.createButtonLabel"
              defaultMessage="Create rollup job"
            />
          </EuiButton>
        }
      />
    );
  }

  renderLoading() {
    return (
      <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>

        <EuiFlexItem grow={false} data-test-subj="jobListLoading">
          <EuiText>
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="xpack.rollupJobs.jobList.loadingTitle"
                defaultMessage="Loading rollup jobs..."
              />
            </EuiTextColor>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  renderList() {
    const { isLoading } = this.props;

    return (
      <Fragment>
        <EuiPageContentHeader>
          {this.getHeaderSection()}

          <EuiPageContentHeaderSection>
            <EuiButton fill {...getRouterLinkProps(`/create`)}>
              <FormattedMessage
                id="xpack.rollupJobs.jobList.createButtonLabel"
                defaultMessage="Create rollup job"
              />
            </EuiButton>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>

        {isLoading ? this.renderLoading() : <JobTable />}

        <DetailPanel />
      </Fragment>
    );
  }

  render() {
    const { isLoading, hasJobs, jobLoadError } = this.props;

    let content;

    if (jobLoadError) {
      if (jobLoadError.status === 403) {
        content = this.renderNoPermission();
      } else {
        content = this.renderError(jobLoadError);
      }
    } else if (!isLoading && !hasJobs) {
      content = this.renderEmpty();
    } else {
      content = this.renderList();
    }

    return (
      <EuiPageContent horizontalPosition="center" className="rollupJobsListPanel">
        {content}
      </EuiPageContent>
    );
  }
}

export const JobList = withKibana(JobListUi);
