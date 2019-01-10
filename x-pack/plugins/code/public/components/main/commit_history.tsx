/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTextColor } from '@elastic/eui';
import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import styled from 'styled-components';
import { CommitInfo } from '../../../model/commit';

const COMMIT_ID_LENGTH = 8;

const Dot = styled.div`
  --dotRadius: 10px;
  width: var(--dotRadius);
  height: var(--dotRadius);
  border-radius: calc(var(--dotRadius) / 2);
  background-color: #d8d8d8;
  margin: auto;
`;

const CommitMessages = styled.div`
  overflow: auto;
  flex: 1;
  padding: 1rem;
`;

const Header = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

const TimeLine = styled.div`
  border-left: 2px solid #d9d9d9;
  margin-left: 4px;
  padding: 0.5rem 0 0.5rem 1rem;
`;

const CommitRoot = styled(EuiPanel)`
  &:not(:first-child) {
    border-top: none;
  }
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

const CommitGroupContainer = styled.div`
  margin: 0 0 4px 10px;
`;

const CommitId = styled.div`
  margin: auto 0;
  height: 20px;
  width: 100px;
  line-height: 20px;
  color: black;
  border: 1px solid #d9d9d9;
  text-align: center;
  flex-shrink: 0;
`;

const CommitContainer = styled.div``;

const Commit = (props: { commit: CommitInfo; date: string }) => {
  const { date, commit } = props;
  const { message, committer, id } = commit;
  return (
    <CommitRoot>
      <CommitContainer>
        <EuiText>
          <p>{message}</p>
        </EuiText>
        <EuiText>
          <EuiTextColor color="subdued">
            {committer} · {date}
          </EuiTextColor>
        </EuiText>
      </CommitContainer>
      <CommitId>
        {id
          .split('')
          .slice(0, COMMIT_ID_LENGTH)
          .join('')}
      </CommitId>
    </CommitRoot>
  );
};

const CommitGroup = (props: { commits: CommitInfo[]; date: string }) => {
  const commitList = props.commits.map(commit => (
    <Commit commit={commit} key={commit.id} date={props.date} />
  ));
  return (
    <CommitGroupContainer>
      <EuiFlexGroup justifyContent="flexStart" gutterSize="s">
        <EuiFlexItem grow={false}>
          <Dot />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h4>
              <EuiTextColor color="subdued">Commits on {props.date}</EuiTextColor>
            </h4>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <TimeLine>{commitList}</TimeLine>
    </CommitGroupContainer>
  );
};

export const CommitHistory = (props: {
  commits: CommitInfo[];
  repoUri: string;
  header: React.ReactNode;
}) => {
  if (!props.commits) {
    return (
      <CommitMessages>
        <h1 className="commitsHeader">Commits</h1>
        <h3>loading</h3>
      </CommitMessages>
    );
  }
  const commits = _.groupBy(props.commits, commit => moment(commit.updated).format('YYYYMMDD'));
  const commitDates = Object.keys(commits).sort();
  const commitList = commitDates.map(cd => (
    <CommitGroup commits={commits[cd]} date={moment(cd).format('MMMM Do, YYYY')} key={cd} />
  ));
  return (
    <CommitMessages>
      <Header>{props.header}</Header>
      {commitList}
    </CommitMessages>
  );
};
