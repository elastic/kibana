/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingChart, EuiPanel, EuiText } from '@elastic/eui';
import * as React from 'react';

import { euiStyled } from '../../../../observability/public';

interface InfraLoadingProps {
  text: string | JSX.Element;
  height: number | string;
  width: number | string;
}

export class InfraLoadingPanel extends React.PureComponent<InfraLoadingProps, {}> {
  public render() {
    const { height, text, width } = this.props;
    return (
      <InfraLoadingStaticPanel style={{ height, width }}>
        <InfraLoadingStaticContentPanel>
          <EuiPanel>
            <EuiLoadingChart size="m" />
            <EuiText>
              <p>{text}</p>
            </EuiText>
          </EuiPanel>
        </InfraLoadingStaticContentPanel>
      </InfraLoadingStaticPanel>
    );
  }
}

export const InfraLoadingStaticPanel = euiStyled.div`
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

export const InfraLoadingStaticContentPanel = euiStyled.div`
  flex: 0 0 auto;
  align-self: center;
  text-align: center;
`;
