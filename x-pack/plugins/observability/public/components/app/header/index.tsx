/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactNode } from 'react';
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
  padding: 0 16px;
`;

interface Props {
  color: string;
  datePicker?: ReactNode;
  restrictWidth?: number;
}

export function Header({ color, datePicker = null, restrictWidth }: Props) {
  return (
    <Container color={color}>
      <Wrapper restrictWidth={restrictWidth}>
        <EuiSpacer size="l" />
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiIcon type="logoObservability" size="xxl" data-test-subj="observability-logo" />
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
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{datePicker}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
      </Wrapper>
    </Container>
  );
}
