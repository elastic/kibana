/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiPageHeader,
  EuiPageContent,
  EuiSpacer,
} from '@elastic/eui';

import { withKibana } from '@kbn/kibana-react-plugin/public';

import { extractQueryParams, SectionLoading } from '../../../shared_imports';
import { getRouterLinkProps, listBreadcrumb } from '../../services';
import { documentationLinks } from '../../services/documentation_links';

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
    this.interval = setInterval(
      () => this.props.refreshJobs({ asSystemRequest: true }),
      REFRESH_RATE_MS
    );
  }

  componentWillUnmount() {
    clearInterval(this.interval);

    // Close the panel, otherwise it will default to already being open when we navigate back to
    // this page.
    this.props.closeDetailPanel();
  }

  renderNoPermission() {
    const title = i18n.translate('xpack.rollupJobs.jobList.noPermissionTitle', {
      defaultMessage: 'Permission error',
    });
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
        <EuiEmptyPrompt
          data-test-subj="jobListNoPermission"
          iconType="alert"
          title={<h1>{title}</h1>}
          body={
            <p>
              <FormattedMessage
                id="xpack.rollupJobs.jobList.noPermissionText"
                defaultMessage="You do not have permission to view or add rollup jobs."
              />
            </p>
          }
        />
      </EuiPageContent>
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
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
        <EuiEmptyPrompt
          data-test-subj="jobListError"
          iconType="alert"
          title={<h1>{title}</h1>}
          body={
            <p>
              {statusCode} {errorString}
            </p>
          }
        />
      </EuiPageContent>
    );
  }

  renderEmpty() {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
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
              {...getRouterLinkProps('/create')}
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
      </EuiPageContent>
    );
  }

  renderLoading() {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <SectionLoading>
          <FormattedMessage
            id="xpack.rollupJobs.jobList.loadingTitle"
            defaultMessage="Loading rollup jobs…"
          />
        </SectionLoading>
      </EuiPageContent>
    );
  }

  renderList() {
    return (
      <>
        <EuiPageHeader
          bottomBorder
          pageTitle={
            <span data-test-subj="jobListPageHeader">
              <FormattedMessage id="xpack.rollupJobs.jobListTitle" defaultMessage="Rollup Jobs" />
            </span>
          }
          rightSideItems={[
            <EuiButtonEmpty
              href={documentationLinks.rollupJobs}
              target="_blank"
              iconType="help"
              data-test-subj="documentationLink"
            >
              <FormattedMessage
                id="xpack.rollupJobs.rollupJobsDocsLinkText"
                defaultMessage="Rollup Jobs docs"
              />
            </EuiButtonEmpty>,
          ]}
        />

        <EuiSpacer size="l" />

        <JobTable />

        <DetailPanel />
      </>
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
    } else if (isLoading) {
      content = this.renderLoading();
    } else {
      content = this.renderList();
    }

    return content;
  }
}

export const JobList = withKibana(JobListUi);
