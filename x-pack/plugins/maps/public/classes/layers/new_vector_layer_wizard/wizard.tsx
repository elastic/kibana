/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiPanel } from '@elastic/eui';

interface Props {
  setEditModeActive: () => void;
  setEditModeInActive: () => void;
}

export class NewVectorLayerEditor extends Component<Props> {
  componentDidMount() {
    this.props.setEditModeActive();
  }

  componentWillUnmount() {
    this.props.setEditModeInActive();
  }

  render() {
    return (
      <EuiPanel>
        <div>Draw shapes</div>
      </EuiPanel>
    );
  }
}
