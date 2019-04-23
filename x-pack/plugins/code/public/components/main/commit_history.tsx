/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { CommitInfo } from '../../../model/commit';
import { CommitLink } from '../diff_page/commit_link';
import { RootState } from '../../reducers';
import { hasMoreCommitsSelector, treeCommitsSelector } from '../../selectors';
import { fetchMoreCommits } from '../../actions';

const COMMIT_ID_LENGTH = 8;

const Commit = (props: { commit: CommitInfo; date: string; repoUri: string }) => {
  const { date, commit } = props;
  const { message, committer, id } = commit;
  const commitId = id
    .split('')
    .slice(0, COMMIT_ID_LENGTH)
    .join('');
  return (
    <EuiPanel className="code-timeline__commit--root">
      <div className="eui-textTruncate">
        <EuiText size="s">
          <p className="eui-textTruncate">{message}</p>
        </EuiText>
        <EuiText size="xs">
          <EuiTextColor color="subdued">
            {committer} · {date}
          </EuiTextColor>
        </EuiText>
      </div>
      <div className="code-commit-id">
        <CommitLink repoUri={props.repoUri} commit={commitId} />
      </div>
    </EuiPanel>
  );
};

const CommitGroup = (props: { commits: CommitInfo[]; date: string; repoUri: string }) => {
  const commitList = props.commits.map(commit => (
    <Commit commit={commit} key={commit.id} date={props.date} repoUri={props.repoUri} />
  ));
  return (
    <div className="code-timeline__commit-container">
      <EuiFlexGroup justifyContent="flexStart" gutterSize="s">
        <EuiFlexItem grow={false}>
          <div className="code-timeline__marker" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h4>
              <EuiTextColor color="subdued">Commits on {props.date}</EuiTextColor>
            </h4>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div className="code-timeline">{commitList}</div>
    </div>
  );
};

export const CommitHistoryLoading = () => (
  <div className="codeLoader">
    <EuiLoadingSpinner size="xl" />
  </div>
);

export const PageButtons = (props: {
  loading?: boolean;
  disabled: boolean;
  onClick: () => void;
}) => (
  <EuiFlexGroup justifyContent="spaceAround">
    <EuiFlexItem grow={false}>
      <EuiButton
        onClick={props.onClick}
        iconType="arrowDown"
        isLoading={props.loading}
        isDisabled={props.disabled}
        size="s"
      >
        More
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const CommitHistoryComponent = (props: {
  commits: CommitInfo[];
  repoUri: string;
  header: React.ReactNode;
  loadingCommits?: boolean;
  showPagination?: boolean;
  hasMoreCommit?: boolean;
  fetchMoreCommits: any;
}) => {
  const commits = _.groupBy(props.commits, commit => moment(commit.updated).format('YYYYMMDD'));
  const commitDates = Object.keys(commits).sort((a, b) => b.localeCompare(a)); // sort desc
  const commitList = commitDates.map(cd => (
    <CommitGroup
      commits={commits[cd]}
      date={moment(cd).format('MMMM Do, YYYY')}
      key={cd}
      repoUri={props.repoUri}
    />
  ));
  return (
    <div className="codeContainer__commitMessages">
      <div className="codeHeader__commit">{props.header}</div>
      {commitList}
      {!props.showPagination && props.loadingCommits && <CommitHistoryLoading />}
      {props.showPagination && (
        <PageButtons
          disabled={!props.hasMoreCommit || props.commits.length < 10}
          onClick={() => props.fetchMoreCommits(props.repoUri)}
          loading={props.loadingCommits}
        />
      )}
    </div>
  );
};

const mapStateToProps = (state: RootState) => ({
  file: state.file.file,
  commits: treeCommitsSelector(state) || [],
  loadingCommits: state.file.loadingCommits,
  hasMoreCommit: hasMoreCommitsSelector(state),
});

const mapDispatchToProps = {
  fetchMoreCommits,
};
export const CommitHistory = connect(
  mapStateToProps,
  mapDispatchToProps
  // @ts-ignore
)(CommitHistoryComponent);
