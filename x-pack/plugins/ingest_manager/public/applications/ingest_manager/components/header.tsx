/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiTabs, EuiTab, EuiSpacer } from '@elastic/eui';
import { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';

const Container = styled.div`
  border-bottom: ${props => props.theme.eui.euiBorderThin};
  background-color: ${props => props.theme.eui.euiPageBackgroundColor};
`;

const Wrapper = styled.div`
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  padding-top: ${props => props.theme.eui.paddingSizes.xl};
  padding-left: ${props => props.theme.eui.paddingSizes.m};
  padding-right: ${props => props.theme.eui.paddingSizes.m};
`;

const Tabs = styled(EuiTabs)`
  top: 1px;
  &:before {
    height: 0px;
  }
`;

export interface HeaderProps {
  leftColumn?: JSX.Element;
  rightColumn?: JSX.Element;
  tabs?: EuiTabProps[];
}

const HeaderColumns: React.FC<Omit<HeaderProps, 'tabs'>> = memo(({ leftColumn, rightColumn }) => (
  <EuiFlexGroup alignItems="center">
    {leftColumn ? <EuiFlexItem>{leftColumn}</EuiFlexItem> : null}
    {rightColumn ? <EuiFlexItem>{rightColumn}</EuiFlexItem> : null}
  </EuiFlexGroup>
));

export const Header: React.FC<HeaderProps> = ({ leftColumn, rightColumn, tabs }) => (
  <Container>
    <Wrapper>
      <HeaderColumns leftColumn={leftColumn} rightColumn={rightColumn} />
      <EuiFlexGroup>
        {tabs ? (
          <EuiFlexItem>
            <Tabs>
              {tabs.map(props => (
                <EuiTab {...props} key={props.id}>
                  {props.name}
                </EuiTab>
              ))}
            </Tabs>
          </EuiFlexItem>
        ) : (
          <EuiFlexItem>
            <EuiSpacer size="l" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </Wrapper>
  </Container>
);
