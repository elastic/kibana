/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiHorizontalRule, EuiIcon, EuiTitle, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';

export const Icon = styled(EuiIcon)`
  margin-right: 8px;
`;

export class HelpMenuComponent extends React.PureComponent {
  public render() {
    return (
      <>
        <EuiHorizontalRule margin="none" />

        <EuiSpacer />

        <EuiTitle size="xxs">
          <h6>
            <Icon type="securityAnalyticsApp" />
            SIEM Application Help
          </h6>
        </EuiTitle>

        <EuiSpacer />

        <EuiButton iconType="popout" href="https://discuss.elastic.co/" target="_blank">
          Submit feedback
        </EuiButton>
      </>
    );
  }
}
