/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import { ToastsSetup } from 'src/core/public';
import { BaseParams } from '../../common/types';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { ReportingPanelContent } from './reporting_panel_content';

export interface Props {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  reportType: string;
  objectId?: string;
  getJobParams: () => BaseParams;
  isDirty?: boolean;
  onClose?: () => void;
}

interface State {
  isPreserveLayoutSupported: boolean;
  usePrintLayout: boolean;
}

export class ScreenCapturePanelContent extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const { objectType } = props.getJobParams();
    const isPreserveLayoutSupported = props.reportType !== 'png' && objectType !== 'visualization';
    this.state = {
      isPreserveLayoutSupported,
      usePrintLayout: false,
    };
  }

  public render() {
    return (
      <ReportingPanelContent
        apiClient={this.props.apiClient}
        toasts={this.props.toasts}
        reportType={this.props.reportType}
        layoutId={this.getLayout().id}
        objectId={this.props.objectId}
        getJobParams={this.getJobParams}
        options={this.renderOptions()}
        isDirty={this.props.isDirty}
        onClose={this.props.onClose}
      />
    );
  }

  private renderOptions = () => {
    if (this.state.isPreserveLayoutSupported) {
      return (
        <Fragment>
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.reporting.screenCapturePanelContent.optimizeForPrintingLabel"
                defaultMessage="Optimize for printing"
              />
            }
            checked={this.state.usePrintLayout}
            onChange={this.handlePrintLayoutChange}
            data-test-subj="usePrintLayout"
          />
          <EuiSpacer size="s" />
        </Fragment>
      );
    }

    return (
      <Fragment>
        <EuiSpacer size="s" />
      </Fragment>
    );
  };

  private handlePrintLayoutChange = (evt: EuiSwitchEvent) => {
    this.setState({ usePrintLayout: evt.target.checked });
  };

  private getLayout = () => {
    if (this.state.usePrintLayout) {
      return { id: 'print' };
    }

    const el = document.querySelector('[data-shared-items-container]');
    const bounds = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };

    return {
      id: this.props.reportType === 'png' ? 'png' : 'preserve_layout',
      dimensions: {
        height: bounds.height,
        width: bounds.width,
      },
    };
  };

  private getJobParams = () => {
    return {
      ...this.props.getJobParams(),
      layout: this.getLayout(),
    };
  };
}
