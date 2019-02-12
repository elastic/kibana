/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiText, EuiTextColor } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import styled from 'styled-components';
import { GitBlame } from '../../../common/git_blame';

const BlameMessage = styled(EuiText)`
  overflow: hidden;
  max-width: 10rem;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Avatar = styled(EuiAvatar)`
  margin: auto ${theme.euiSizeS} auto 0;
`;

const Root = styled(EuiFlexGroup)<{ isFirstLine: boolean }>`
  padding: ${theme.paddingSizes.xs} ${theme.paddingSizes.s};
  border-top: ${props => (props.isFirstLine ? 'none' : theme.euiBorderThick)};
`;

export class Blame extends React.PureComponent<{ blame: GitBlame; isFirstLine: boolean }> {
  public render(): React.ReactNode {
    const { blame, isFirstLine } = this.props;
    return (
      <Root gutterSize="none" justifyContent="spaceBetween" isFirstLine={isFirstLine}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none" alignItems="center">
            <EuiFlexItem grow={false}>
              <Avatar size="s" type="space" name={blame.committer.name} initialsLength={1} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <BlameMessage>{blame.commit.message}</BlameMessage>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <EuiTextColor color="subdued">{moment(blame.commit.date).fromNow()}</EuiTextColor>
          </EuiText>
        </EuiFlexItem>
      </Root>
    );
  }
}
