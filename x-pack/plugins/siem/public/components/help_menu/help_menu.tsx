/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiHorizontalRule, EuiText, EuiSpacer } from '@elastic/eui';

export class HelpMenu extends React.PureComponent {
  public render() {
    return (
      <React.Fragment>
        <EuiHorizontalRule margin="none" />
        <EuiSpacer />
        <EuiText size="s">
          <p>For SIEM specific information:</p>
        </EuiText>
        <EuiSpacer />
        <EuiButton fill iconType="popout" href="https://discuss.elastic.co/" target="_blank">
          Submit feedback
        </EuiButton>
      </React.Fragment>
    );
  }
}
