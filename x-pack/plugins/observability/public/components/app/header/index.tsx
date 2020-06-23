/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';

const Container = styled.div<{ color: string }>`
  background: ${(props) => props.color};
  border-bottom: ${(props) => props.theme.eui.euiBorderThin};
`;

const Wrapper = styled.div<{ restrictWidth?: number }>`
  width: 100%;
  max-width: ${(props) => `${props.restrictWidth}px`};
  margin: 0 auto;
  overflow: hidden;
  padding: ${(props) => (props.restrictWidth ? 0 : '0 24px')};
`;

interface Props {
  color: string;
  restrictWidth?: number;
}

export const Header = ({ color, restrictWidth }: Props) => {
  return (
    <Container color={color}>
      <Wrapper restrictWidth={restrictWidth}>
        <EuiSpacer size="xxl" />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoObservability" size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h1>
                {i18n.translate('xpack.observability.home.title', {
                  defaultMessage: 'Observability',
                })}
              </h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xxl" />
      </Wrapper>
    </Container>
  );
};
