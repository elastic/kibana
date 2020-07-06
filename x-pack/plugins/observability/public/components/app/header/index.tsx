/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { EuiButtonEmpty } from '@elastic/eui';
import { EuiBetaBadge } from '@elastic/eui';

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
  showAddData?: boolean;
  restrictWidth?: number;
}

export const Header = ({ color, restrictWidth, showAddData = false }: Props) => {
  return (
    <Container color={color}>
      <Wrapper restrictWidth={restrictWidth}>
        <EuiSpacer size="l" />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoObservability" size="xxl" data-test-subj="observability-logo" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h1>
                {i18n.translate('xpack.observability.home.title', {
                  defaultMessage: 'Observability',
                })}{' '}
                <EuiBetaBadge
                  label={i18n.translate('xpack.observability.beta', { defaultMessage: 'Beta' })}
                  tooltipContent="This feature is in beta. Please help us improve it by reporting any bugs or give us feedback."
                />
              </h1>
            </EuiTitle>
          </EuiFlexItem>
          {showAddData && (
            <EuiFlexItem style={{ alignItems: 'flex-end' }}>
              {/* TODO: caue: what is the URL here? */}
              <EuiButtonEmpty href="https://www.elastic.co" iconType="plusInCircle">
                {i18n.translate('xpack.observability.home.addData', { defaultMessage: 'Add data' })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="l" />
      </Wrapper>
    </Container>
  );
};
