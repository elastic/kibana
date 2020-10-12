/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { usePluginContext } from '../../../hooks/use_plugin_context';

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
  showAddData?: boolean;
  restrictWidth?: number;
  showGiveFeedback?: boolean;
}

export function Header({
  color,
  restrictWidth,
  showAddData = false,
  showGiveFeedback = false,
}: Props) {
  const { core } = usePluginContext();
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
                })}
              </h1>
            </EuiTitle>
          </EuiFlexItem>
          {showGiveFeedback && (
            <EuiFlexItem style={{ alignItems: 'flex-end' }} grow={false}>
              <EuiButtonEmpty href={'https://ela.st/observability-discuss'} iconType="popout">
                {i18n.translate('xpack.observability.home.feedback', {
                  defaultMessage: 'Give us feedback',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          {showAddData && (
            <EuiFlexItem style={{ alignItems: 'flex-end' }} grow={false}>
              <EuiButtonEmpty
                href={core.http.basePath.prepend('/app/home#/tutorial_directory/logging')}
                iconType="plusInCircle"
              >
                {i18n.translate('xpack.observability.home.addData', { defaultMessage: 'Add data' })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="l" />
      </Wrapper>
    </Container>
  );
}
