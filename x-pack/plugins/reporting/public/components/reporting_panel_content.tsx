/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Remove once typescript definitions are in EUI
declare module '@elastic/eui' {
  export const EuiCopy: React.SFC<any>;
  export const EuiForm: React.SFC<any>;
}

import { EuiButton, EuiCopy, EuiForm, EuiFormRow, EuiSwitch, EuiText } from '@elastic/eui';
import moment from 'moment-timezone';
import React, { Component } from 'react';
import rison from 'rison-node';
import chrome from 'ui/chrome';
import { QueryString } from 'ui/utils/query_string';
import url from 'url';

import { unhashUrl } from 'ui/state_management/state_hashing';

enum ReportType {
  PDF = 'PDF',
  PNG = 'PNG',
}

interface Props {
  reportType: ReportType;
  objectId?: string;
  objectType: string;
  getUnhashableStates: () => object[];
  title: string;
}

interface State {
  usePrintLayout: boolean;
  isDirty: boolean;
  url?: string;
}

export class ReportingPanelContent extends Component<Props, State> {
  private mounted?: boolean;

  constructor(props: Props) {
    super(props);

    this.state = {
      usePrintLayout: false,
      isDirty: false,
    };
  }

  public componentWillUnmount() {
    window.removeEventListener('hashchange', this.markAsDirty);

    this.mounted = false;
  }

  public componentDidMount() {
    this.mounted = true;

    window.addEventListener('hashchange', this.markAsDirty, false);
  }

  public render() {
    if (this.isNotSaved() || this.state.isDirty) {
      return (
        <EuiForm className="sharePanelContent" data-test-subj="shareReportingForm">
          <EuiFormRow helpText="Please save your work before generating a report.">
            <EuiButton disabled>Generate {this.props.reportType}</EuiButton>
          </EuiFormRow>
        </EuiForm>
      );
    }

    const reportMsg = `${
      this.props.reportType
    }s can take a minute or two to generate based upon the size of your ${this.props.objectType}.`;

    return (
      <EuiForm className="sharePanelContent" data-test-subj="shareReportingForm">
        <EuiFormRow>
          <EuiText>
            <p>{reportMsg}</p>
          </EuiText>
        </EuiFormRow>

        <EuiFormRow>
          <EuiSwitch
            label="Optimize for printing"
            checked={this.state.usePrintLayout}
            onChange={this.handlePrintLayoutChange}
            data-test-subj="usePrintLayout"
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiButton fill>Generate {this.props.reportType}</EuiButton>
        </EuiFormRow>

        <EuiFormRow>
          <EuiText>
            <p>
              Alternatively, copy this POST URL to call generation from outside Kibana or from
              Watcher.
            </p>
          </EuiText>
        </EuiFormRow>

        <EuiCopy textToCopy={this.getAbsoluteReportGenerationUrl()}>
          {(copy: () => void) => (
            <EuiFormRow>
              <EuiButton onClick={copy}>Copy POST URL</EuiButton>
            </EuiFormRow>
          )}
        </EuiCopy>
      </EuiForm>
    );
  }

  private handlePrintLayoutChange = async (evt: any) => {
    this.setState({ usePrintLayout: evt.target.checked });
  };

  private markAsDirty = () => {
    if (!this.mounted) {
      return;
    }

    this.setState({ isDirty: true });
  };

  private isNotSaved = () => {
    return this.props.objectId === undefined || this.props.objectId === '';
  };

  private getLayout = () => {
    if (this.state.usePrintLayout) {
      return { id: 'print' };
    }

    const el = document.querySelector('[data-shared-items-container]');
    const bounds = el.getBoundingClientRect();
    return {
      id: 'preserve_layout',
      dimensions: {
        height: bounds.height,
        width: bounds.width,
      },
    };
  };

  private getAbsoluteReportGenerationUrl = () => {
    return url.resolve(window.location.href, this.getRelativeReportGenerationUrl());
  };

  private getRelativeReportGenerationUrl = () => {
    // Replace hashes with original RISON values.
    const unhashedUrl = unhashUrl(window.location.href, this.props.getUnhashableStates());
    const relativeUrl = unhashedUrl.replace(window.location.origin + chrome.getBasePath(), '');

    const browserTimezone =
      chrome.getUiSettingsClient().get('dateFormat:tz') === 'Browser'
        ? moment.tz.guess()
        : chrome.getUiSettingsClient().get('dateFormat:tz');

    const jobParams = {
      title: this.props.title,
      objectType: this.props.objectType,
      browserTimezone,
      relativeUrls: [relativeUrl],
      layout: this.getLayout(),
    };

    const reportPrefix = chrome.addBasePath('/api/reporting/generate');
    return `${reportPrefix}/printablePdf?${QueryString.param(
      'jobParams',
      rison.encode(jobParams)
    )}`;
  };
}
