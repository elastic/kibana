/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import { EuiPanel } from '@elastic/eui';
import { AnomalySourceDescriptor } from './anomaly_source';
import { AnomalyJobSelector } from './anomaly_job_selector';
import { LayerSelector } from './layer_selector';

interface Props {
  onSourceConfigChange: (sourceConfig: Partial<AnomalySourceDescriptor> | null) => void;
  mlJobsService: any; // todo: update types
}

interface State {
  jobId?: string;
  typicalActual?: 'typical' | 'actual';
}

export class CreateAnomalySourceEditor extends Component<Props, State> {
  private _isMounted: boolean = false;
  state: State = {};

  private configChange() {
    if (this.state.jobId) {
      this.props.onSourceConfigChange({
        jobId: this.state.jobId,
        typicalActual: this.state.typicalActual,
      });
    }
  }

  componentDidMount(): void {
    this._isMounted = true;
  }

  private onTypicalActualChange = (typicalActual: 'typical' | 'actual') => {
    if (!this._isMounted) {
      return;
    }
    this.setState(
      {
        typicalActual,
      },
      () => {
        this.configChange();
      }
    );
  };

  private previewLayer = (jobId: string) => {
    if (!this._isMounted) {
      return;
    }
    this.setState(
      {
        jobId,
      },
      () => {
        this.configChange();
      }
    );
  };

  render() {
    const selector = this.state.jobId ? (
      <LayerSelector
        onChange={this.onTypicalActualChange}
        typicalActual={this.state.typicalActual || 'typical'}
      />
    ) : null;
    return (
      <EuiPanel>
        <AnomalyJobSelector
          onJobChange={this.previewLayer}
          mlJobsService={this.props.mlJobsService}
        />
        {selector}
      </EuiPanel>
    );
  }
}
