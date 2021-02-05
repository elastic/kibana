/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import { EuiPanel } from '@elastic/eui';
import { AnomalySourceDescriptor } from './anomaly_source';

interface Props {
  onSourceConfigChange: (sourceConfig: Partial<AnomalySourceDescriptor> | null) => void;
}

interface State {
  jobId: string;
}

export class CreateAnomalySourceEditor extends Component<Props, State> {
  previewLayer = () => {
    this.props.onSourceConfigChange(null);
  };

  render() {
    return <EuiPanel>Show dropdown here</EuiPanel>;
  }
}
