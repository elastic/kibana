/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../constants';
import { getRouterLinkProps, extractQueryParams } from '../../services';

import {
  JobTable,
} from './job_table';

import {
  DetailPanel,
} from './detail_panel';

const REFRESH_RATE_MS = 30000;

export class JobListUi extends Component {
  static propTypes = {
    loadJobs: PropTypes.func,
    openDetailPanel: PropTypes.func,
    jobs: PropTypes.array,
    isLoading: PropTypes.bool.isRequired,
  }

  static getDerivedStateFromProps(props) {
    const {
      openDetailPanel,
      history: {
        location: {
          search,
        },
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

    this.state = {};

    props.loadJobs();
  }

  componentDidMount() {
    this.interval = setInterval(this.props.loadJobs, REFRESH_RATE_MS);
  }

  componentWillUnmount() {
    clearInterval(this.interval);

    // Close the panel, otherwise it will default to already being open when we navigate back to
    // this page.
    this.props.closeDetailPanel();
  }

  renderEmpty() {
    return (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={(
          <h1>
            <FormattedMessage
              id="xpack.rollupJobs.jobList.emptyPrompt.title"
              defaultMessage="Create your first rollup job"
            />
          </h1>
        )}
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.rollupJobs.jobList.emptyPrompt.description"
                defaultMessage={`
                  Rollup jobs summarize and store your data in a format that's compressed, yet aggregatable.
                `}
              />
            </p>
          </Fragment>
        }
        actions={
          <EuiButton
            {...getRouterLinkProps(`${CRUD_APP_BASE_PATH}/create`)}
            fill
            iconType="plusInCircle"
          >
            <FormattedMessage
              id="xpack.rollupJobs.jobList.emptyPrompt.createButton.label"
              defaultMessage="Create rollup job"
            />
          </EuiButton>
        }
      />
    );
  }

  renderList() {
    const { isLoading } = this.props;

    let table;

    if (isLoading) {
      table = (
        <EuiFlexGroup
          justifyContent="flexStart"
          alignItems="center"
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText>
              <EuiTextColor color="subdued">
                <FormattedMessage
                  id="xpack.rollupJobs.jobList.loading.title"
                  defaultMessage="Loading rollup jobs..."
                />
              </EuiTextColor>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    } else {
      table = <JobTable />;
    }

    return (
      <Fragment>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="xpack.rollupJobs.jobList.title"
                  defaultMessage="Rollup jobs"
                />
              </h1>
            </EuiTitle>
          </EuiPageContentHeaderSection>

          <EuiPageContentHeaderSection>
            <EuiButton fill {...getRouterLinkProps(`${CRUD_APP_BASE_PATH}/create`)}>
              <h1>
                <FormattedMessage
                  id="xpack.rollupJobs.jobList.createButton.label"
                  defaultMessage="Create rollup job"
                />
              </h1>
            </EuiButton>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>

        {table}

        <DetailPanel />
      </Fragment>
    );
  }

  render() {
    const { isLoading, jobs } = this.props;

    let content;

    if (!isLoading && !jobs.length) {
      content = this.renderEmpty();
    } else {
      content = this.renderList();
    }

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            {content}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const JobList = injectI18n(JobListUi);

