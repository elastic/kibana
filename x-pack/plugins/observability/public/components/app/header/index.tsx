/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderLink,
  EuiHeaderLinks,
  EuiIcon,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { HeaderMenuPortal } from '../../shared/header_menu_portal';

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
  const { appMountParameters, core } = usePluginContext();
  const { setHeaderActionMenu } = appMountParameters;
  const { prepend } = core.http.basePath;

  return (
    <Container color={color}>
      <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu}>
        <EuiHeaderLinks>
          <EuiHeaderLink
            color="primary"
            href={prepend('/app/home#/tutorial_directory/logging')}
            iconType="indexOpen"
          >
            {i18n.translate('xpack.observability.home.addData', { defaultMessage: 'Add data' })}
          </EuiHeaderLink>
        </EuiHeaderLinks>
      </HeaderMenuPortal>
      <Wrapper restrictWidth={restrictWidth}>
        <EuiSpacer size="l" />
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiIcon type="logoObservability" size="xxl" data-test-subj="observability-logo" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle>
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
