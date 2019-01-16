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
import { Repository } from 'x-pack/plugins/code/model';
import { deleteRepo, indexRepo, initRepoCommand } from '../../actions';
import { RepoState, RepoStatus } from '../../reducers/status';

const Footer = styled.div``;

const stateColor = {
  [RepoState.CLONING]: 'secondary',
  [RepoState.DELETING]: 'accent',
  [RepoState.INDEXING]: 'primary',
};

class CodeProjectItem extends React.PureComponent<{
  project: Repository;
  isAdmin: boolean;
  status: RepoStatus;
  deleteRepo: (uri: string) => void;
  indexRepo: (uri: string) => void;
  initRepoCommand: (uri: string) => void;
  openSettings: (uri: string, url: string) => void;
}> {
  public render() {
    const { project, status } = this.props;
    const { name, org, nextUpdateTimestamp, uri, url } = project;
    const onClickDelete = () => this.props.deleteRepo(uri);
    const onClickIndex = () => this.props.indexRepo(uri);
    const onClickSettings = () => this.props.openSettings(uri, url);
    let footer = null;
    if (!status || status.state === RepoState.READY) {
      footer = <Footer>LAST UPDATED: {moment(nextUpdateTimestamp).fromNow()}</Footer>;
    } else if (status.state === RepoState.DELETING) {
      footer = <Footer>DELETING...</Footer>;
    } else if (status.state === RepoState.INDEXING) {
      footer = <Footer>INDEXING...</Footer>;
    } else if (status.state === RepoState.CLONING) {
      footer = <Footer>CLONING...</Footer>;
    }
    return (
      <EuiPanel style={{ position: 'relative', marginBottom: '8px' }}>
        {this.renderProgress()}
        <EuiFlexGroup alignItems="center" justifyContent="flexStart">
          <EuiFlexItem grow={3}>
            <Link to={`/${uri}`}>
              <EuiText data-test-subj="codeRepositoryItem">
                <EuiTextColor color="subdued">{org}</EuiTextColor>/<strong>{name}</strong>
              </EuiText>
            </Link>
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
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem grow={false}>
                <div className="code-project-button" onClick={onClickSettings} role="button">
                  <EuiIcon type="gear" />
                  <EuiText size="xs" color="subdued">
                    Settings
                  </EuiText>
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div className="code-project-button" onClick={onClickIndex} role="button">
                  <EuiIcon type="indexSettings" />
                  <EuiText size="xs" color="subdued">
                    Index
                  </EuiText>
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div className="code-project-button" onClick={onClickDelete} role="button">
                  <EuiIcon type="trash" color="danger" />
                  <EuiText size="xs" color="subdued">
                    Delete
                  </EuiText>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  private renderProgress() {
    const { status } = this.props;
    if (status && status.state !== RepoState.READY) {
      const color = stateColor[status.state] as 'primary' | 'secondary' | 'accent';
      if (status.progress! > 0) {
        return (
          <EuiProgress
            max={100}
            value={status.progress}
            size="xs"
            color={color}
            position="absolute"
          />
        );
      } else {
        return <EuiProgress size="xs" color={color} position="absolute" />;
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
