/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Repository, WorkerReservedProgress } from '../../../model';
import { deleteRepo, indexRepo, initRepoCommand } from '../../actions';
import { RepoState, RepoStatus } from '../../reducers/status';

const errorColor = `#BD271E`;
const Footer = styled.div``;
const ErrorFooter = styled(Footer)`
  color: ${errorColor};
`;

const ProjectItemPanel = styled(EuiPanel)`
  position: relative;
  margin-bottom: 8px;
`;
const ErrorProjectItemPanel = styled(ProjectItemPanel)`
  border: 2px solid ${errorColor};
`;

const stateColor = {
  [RepoState.CLONING]: 'secondary',
  [RepoState.DELETING]: 'accent',
  [RepoState.INDEXING]: 'primary',
};

class CodeProjectItem extends React.PureComponent<{
  project: Repository;
  enableManagement: boolean;
  status?: RepoStatus;
  deleteRepo?: (uri: string) => void;
  indexRepo?: (uri: string) => void;
  initRepoCommand?: (uri: string) => void;
  openSettings?: (uri: string, url: string) => void;
}> {
  public render() {
    const { project, status, enableManagement } = this.props;
    const { name, org, nextUpdateTimestamp, uri, url } = project;
    const onClickDelete = () => this.props.deleteRepo && this.props.deleteRepo(uri);
    const onClickIndex = () => this.props.indexRepo && this.props.indexRepo(uri);
    const onClickSettings = () => this.props.openSettings && this.props.openSettings(uri, url);
    let footer = null;
    let disableRepoLink = false;
    let hasError = false;
    if (!status) {
      footer = <Footer>INIT...</Footer>;
    } else if (status.state === RepoState.READY) {
      footer = (
        <Footer data-test-subj="repositoryIndexDone">
          LAST UPDATED: {moment(nextUpdateTimestamp).fromNow()}
        </Footer>
      );
    } else if (status.state === RepoState.DELETING) {
      footer = <Footer>DELETING...</Footer>;
    } else if (status.state === RepoState.INDEXING) {
      footer = <Footer>INDEXING...</Footer>;
    } else if (status.state === RepoState.CLONING) {
      footer = <Footer>CLONING...</Footer>;
    } else if (status.state === RepoState.DELETE_ERROR) {
      footer = <ErrorFooter>ERROR DELETE REPO</ErrorFooter>;
      hasError = true;
    } else if (status.state === RepoState.INDEX_ERROR) {
      footer = <ErrorFooter>ERROR INDEX REPO</ErrorFooter>;
      hasError = true;
    } else if (status.state === RepoState.CLONE_ERROR) {
      footer = <ErrorFooter>ERROR CLONE REPO</ErrorFooter>;
      // Disable repo link is clone failed.
      disableRepoLink = true;
      hasError = true;
    }

    const repoTitle = (
      <EuiText data-test-subj="codeRepositoryItem">
        <EuiTextColor color="subdued">{org}</EuiTextColor>/<strong>{name}</strong>
      </EuiText>
    );

    const Panel = hasError ? ErrorProjectItemPanel : ProjectItemPanel;

    const projectManagement = (
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="none">
          {status && status.state !== RepoState.CLONING && (
            <EuiFlexItem grow={false}>
              <div className="code-project-button" onClick={onClickSettings} role="button">
                <EuiIcon type="gear" />
                <EuiText size="xs" color="subdued">
                  Settings
                </EuiText>
              </div>
            </EuiFlexItem>
          )}
          {status && status.state !== RepoState.CLONING && (
            <EuiFlexItem grow={false}>
              <div className="code-project-button" onClick={onClickIndex} role="button">
                <EuiIcon type="indexSettings" />
                <EuiText size="xs" color="subdued">
                  Index
                </EuiText>
              </div>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <div
              className="code-project-button"
              data-test-subj="deleteRepositoryButton"
              onClick={onClickDelete}
              role="button"
            >
              <EuiIcon type="trash" color="danger" />
              <EuiText size="xs" color="subdued">
                Delete
              </EuiText>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );

    return (
      <Panel>
        {this.renderProgress()}
        <EuiFlexGroup alignItems="center" justifyContent="flexStart">
          <EuiFlexItem grow={3}>
            {disableRepoLink ? repoTitle : <Link to={`/${uri}`}>{repoTitle}</Link>}
            <EuiText>
              <h6>
                <EuiTextColor color="subdued">{footer}</EuiTextColor>
              </h6>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiText color="subdued" size="s">
              <a href={'https://' + uri} target="_blank">
                {uri}
              </a>
            </EuiText>
          </EuiFlexItem>
          {enableManagement && projectManagement}
        </EuiFlexGroup>
      </Panel>
    );
  }

  private renderProgress() {
    const { status } = this.props;
    if (
      status &&
      (status.state === RepoState.CLONING ||
        status.state === RepoState.DELETING ||
        status.state === RepoState.INDEXING)
    ) {
      const color = stateColor[status.state] as 'primary' | 'secondary' | 'accent';
      if (status.progress! === WorkerReservedProgress.COMPLETED) {
        return null;
      } else if (status.progress! > WorkerReservedProgress.INIT) {
        return (
          <EuiProgress
            max={100}
            value={status.progress}
            size="s"
            color={color}
            position="absolute"
          />
        );
      } else {
        return <EuiProgress size="s" color={color} position="absolute" />;
      }
    }
  }
}

const mapDispatchToProps = {
  deleteRepo,
  indexRepo,
  initRepoCommand,
};

export const ProjectItem = connect(
  null,
  mapDispatchToProps
)(CodeProjectItem);
