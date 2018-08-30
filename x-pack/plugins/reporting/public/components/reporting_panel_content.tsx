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

import {
  EuiButton,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiRadioGroup,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import React, { Component } from 'react';

import { format as formatUrl, parse as parseUrl } from 'url';

// TODO: Remove once EuiIconTip supports "content" prop
const FixedEuiIconTip = EuiIconTip as React.SFC<any>;

enum ReportType {
  PDF = 'PDF',
  PNG = 'PNG',
}

interface Props {
  reportType: ReportType;
  objectId?: string;
  objectType: string;
}

interface State {
  usePrintLayout: boolean;
}

export class ReportingPanelContent extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      usePrintLayout: false,
    };
  }

  public render() {
    const reportMsg = `${
      this.props.reportType
    }s can take a minute or two to generate based upon the size of your ${this.props.objectType}`;
    return (
      <EuiForm className="sharePanelContent" data-test-subj="shareReportingForm">
        <EuiText>
          <p>{reportMsg}</p>
        </EuiText>
      </EuiForm>
    );
  }

  private isNotSaved = () => {
    return this.props.objectId === undefined || this.props.objectId === '';
  };
}
