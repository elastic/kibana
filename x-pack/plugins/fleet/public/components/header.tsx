/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiTabs, EuiTab, EuiSpacer } from '@elastic/eui';
import type { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import type { EuiFlexItemProps } from '@elastic/eui/src/components/flex/flex_item';

const Container = styled.div`
  border-bottom: ${(props) => props.theme.eui.euiBorderThin};
  background-color: ${(props) => props.theme.eui.euiPageBackgroundColor};

  @media (max-width: 767px) {
    .euiFlexItem {
      margin-bottom: 0 !important;
    }
  }
`;

const Wrapper = styled.div<{ maxWidth?: number }>`
  max-width: ${(props) => props.maxWidth || 1200}px;
  margin-left: auto;
  margin-right: auto;
  padding-top: ${(props) => props.theme.eui.paddingSizes.xl};
  padding-left: ${(props) => props.theme.eui.paddingSizes.m};
  padding-right: ${(props) => props.theme.eui.paddingSizes.m};
`;

const Tabs = styled(EuiTabs)`
  top: 1px;
  &:before {
    height: 0px;
  }
`;

export interface HeaderProps {
  maxWidth?: number;
  leftColumn?: JSX.Element;
  rightColumn?: JSX.Element;
  rightColumnGrow?: EuiFlexItemProps['grow'];
  topContent?: JSX.Element;
  tabs?: Array<Omit<EuiTabProps, 'name'> & { name?: JSX.Element | string }>;
  tabsClassName?: string;
  'data-test-subj'?: string;
}

const HeaderColumns: React.FC<Omit<HeaderProps, 'tabs'>> = memo(
  ({ leftColumn, rightColumn, rightColumnGrow }) => (
    <EuiFlexGroup alignItems="center">
      {leftColumn ? <EuiFlexItem>{leftColumn}</EuiFlexItem> : null}
      {rightColumn ? <EuiFlexItem grow={rightColumnGrow}>{rightColumn}</EuiFlexItem> : null}
    </EuiFlexGroup>
  )
);

export const Header: React.FC<HeaderProps> = ({
  leftColumn,
  rightColumn,
  rightColumnGrow,
  topContent,
  tabs,
  maxWidth,
  tabsClassName,
  'data-test-subj': dataTestSubj,
}) => (
  <Container data-test-subj={dataTestSubj}>
    <Wrapper maxWidth={maxWidth}>
      {topContent}
      <HeaderColumns
        leftColumn={leftColumn}
        rightColumn={rightColumn}
        rightColumnGrow={rightColumnGrow}
      />
      <EuiFlexGroup>
        {tabs ? (
          <EuiFlexItem>
            <EuiSpacer size="s" />
            <Tabs className={tabsClassName}>
              {tabs.map((props, index) => (
                <EuiTab {...(props as EuiTabProps)} key={`${props.id}-${index}`}>
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
