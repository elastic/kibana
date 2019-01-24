/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React from 'react';
import styled from 'styled-components';
import { GitBlame } from '../../../common/git_blame';
import { colors, fontSizes } from '../../style/variables';
import { CommitLink } from '../diff_page/commit_link';

interface Props {
  blames: GitBlame[];
  lineHeight: number;
  repoUri: string;
}

interface BlameContainerProps {
  lineHeight: number;
  lines: number;
}

const BlameContainer = styled('div')<BlameContainerProps>`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  flex: 1 1 30rem;
  padding: 0 0.5rem;
  height: ${props => props.lineHeight * props.lines}px;
  border-bottom: 1px solid ${colors.borderGrey};
`;

const BlameMessage = styled.div`
  margin-right: 5px;
  overflow: auto;
  color: ${colors.textGrey};
`;

const BlameDate = styled.div`
  white-space: nowrap;
  text-decoration: underline;
  color: ${colors.textGrey};
  font-size: ${fontSizes.small};
`;
export class BlameComponent extends React.PureComponent<{ blame: GitBlame; lineHeight: number }> {
  public render(): React.ReactNode {
    const { blame, lineHeight } = this.props;
    return (
      <BlameContainer lines={blame.lines} lineHeight={this.props.lineHeight}>
        <BlameMessage>{blame.commit.message}</BlameMessage>
        <BlameDate>{moment(blame.commit.date).fromNow()}</BlameDate>
      </BlameContainer>
    );
  }
}

export class Blame extends React.PureComponent<Props> {
  public render() {
    return this.props.blames.map((blame: GitBlame, index) => (
      <BlameContainer key={index} lines={blame.lines} lineHeight={this.props.lineHeight}>
        <BlameMessage>
          <CommitLink repoUri={this.props.repoUri} commit={blame.commit.id}>
            {blame.commit.message}
          </CommitLink>
        </BlameMessage>
        <BlameDate>{moment(blame.commit.date).fromNow()}</BlameDate>
      </BlameContainer>
    ));
  }
}
