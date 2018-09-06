/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { toastNotifications } from 'ui/notify';
import { jobQueueClient } from '../lib/job_queue_client';

import { EuiBasicTable, EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui';

interface Props {
  xpackInfo: any;
  kbnUrl: any;
}

interface State {
  page: number;
  total: number;
  jobs: [];
  isLoading: boolean;
}

export class ReportListing extends Component<Props, State> {
  private mounted?: boolean;

  constructor(props: Props) {
    super(props);

    this.state = {
      page: 0,
      total: 0,
      jobs: [],
      isLoading: false,
    };
  }

  public render() {
    return (
      <EuiPage restrictWidth>
        <EuiPageBody>
          <EuiPageContent horizontalPosition="center">
            {this.renderListingOrEmptyState()}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  public componentWillMount() {
    this.mounted = true;
  }

  public componentWillUnmount() {
    this.mounted = false;
  }

  public componentDidMount() {
    this.mounted = true;
    this.fetchJobs();
  }

  private renderListingOrEmptyState() {
    return <div>getting closer now</div>;
  }

  private fetchJobs = async () => {
    this.setState({ isLoading: true, jobs: [] });

    let jobs;
    let total;
    try {
      jobs = await jobQueueClient.list(this.state.page);
      total = await jobQueueClient.total();
    } catch (kfetchError) {
      if (!this.licenseAllowsToShowThisPage()) {
        toastNotifications.addDanger(
          this.props.xpackInfo.get('features.reporting.management.message')
        );
        this.props.kbnUrl.redirect('/management');
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
        jobs: jobs.map((job: any) => {
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
            content_type: job._source.output ? job._source.output.content_type : false,
            max_size_reached: job._source.output ? job._source.output.max_size_reached : false,
          };
        }),
      });
    }
  };

  private licenseAllowsToShowThisPage = () => {
    return (
      this.props.xpackInfo.get('features.reporting.management.showLinks') &&
      this.props.xpackInfo.get('features.reporting.management.enableLinks')
    );
  };
}
