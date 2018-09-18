/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiSwitch } from '@elastic/eui';
import React, { Component, Fragment } from 'react';
import { ReportingPanelContent } from './reporting_panel_content';

interface Props {
  reportType: string;
  objectId?: string;
  objectType: string;
  getJobParams: () => any;
  isDirty: boolean;
  onClose: () => void;
}

interface State {
  usePrintLayout: boolean;
}

export class ScreenCapturePanelContent extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      usePrintLayout: false,
    };
  }

  public render() {
    return (
      <ReportingPanelContent
        reportType={this.props.reportType}
        objectType={this.props.objectType}
        objectId={this.props.objectId}
        getJobParams={this.getJobParams}
        options={this.renderOptions()}
        isDirty={this.props.isDirty}
        onClose={this.props.onClose}
      />
    );
  }

  private renderOptions = () => {
    return (
      <Fragment>
        <EuiSwitch
          label="Optimize for printing"
          checked={this.state.usePrintLayout}
          onChange={this.handlePrintLayoutChange}
          data-test-subj="usePrintLayout"
        />
        <EuiSpacer size="s" />
      </Fragment>
    );
  };

  private handlePrintLayoutChange = (evt: any) => {
    this.setState({ usePrintLayout: evt.target.checked });
  };

  private getLayout = () => {
    if (this.state.usePrintLayout) {
      return { id: 'print' };
    }

    const el = document.querySelector('[data-shared-items-container]');
    const bounds = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
    return {
      id: 'preserve_layout',
      dimensions: {
        height: bounds.height,
        width: bounds.width,
      },
    };
  };

  private getJobParams = () => {
    const jobParams = this.props.getJobParams();
    jobParams.layout = this.getLayout();
    return jobParams;
  };
}
