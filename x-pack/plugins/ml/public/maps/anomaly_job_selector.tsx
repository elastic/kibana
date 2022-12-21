/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import { EuiComboBox, EuiFormRow, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import type { MlApiServices } from '../application/services/ml_api_service';
import { AnomalyJobSelectorEmptyState } from './anomaly_job_selector_empty_state';

interface Props {
  onJobChange: (jobId: string) => void;
  mlJobsService: MlApiServices['jobs'];
  jobsManagementPath?: string;
  canCreateJobs: boolean;
}

interface State {
  jobId?: string;
  jobIdList?: Array<EuiComboBoxOptionOption<string>>;
}

export class AnomalyJobSelector extends Component<Props, State> {
  private _isMounted: boolean = false;

  state: State = {};

  private async _loadJobs() {
    const jobIdList = await this.props.mlJobsService.jobIdsWithGeo();
    const options = jobIdList.map((jobId) => {
      return { label: jobId, value: jobId };
    });
    if (this._isMounted && !isEqual(options, this.state.jobIdList)) {
      this.setState({
        jobIdList: options,
      });
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>): void {
    this._loadJobs();
  }

  componentDidMount(): void {
    this._isMounted = true;
    this._loadJobs();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  onJobIdSelect = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    const jobId: string = selectedOptions[0].value!;
    if (this._isMounted) {
      this.setState({ jobId });
      this.props.onJobChange(jobId);
    }
  };

  render() {
    const supportedJobsExist = this.state.jobIdList?.length && this.state.jobIdList?.length > 0;
    return supportedJobsExist || !this.props.jobsManagementPath ? (
      <EuiFormRow
        label={i18n.translate('xpack.ml.maps.jobIdLabel', {
          defaultMessage: 'Job ID',
        })}
        display="columnCompressed"
      >
        <EuiComboBox
          singleSelection={true}
          onChange={this.onJobIdSelect}
          options={this.state.jobIdList}
          selectedOptions={
            this.state.jobId ? [{ value: this.state.jobId, label: this.state.jobId }] : []
          }
        />
      </EuiFormRow>
    ) : (
      <AnomalyJobSelectorEmptyState
        jobsManagementPath={this.props.jobsManagementPath}
        canCreateJobs={this.props.canCreateJobs}
      />
    );
  }
}
