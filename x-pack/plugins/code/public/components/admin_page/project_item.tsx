/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiProgress,
  EuiText,
  EuiTextColor,
  EuiToolTip,
  EuiConfirmModal,
  EuiOverlayMask,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { Repository, WorkerReservedProgress } from '../../../model';
import { deleteRepo, indexRepo, initRepoCommand } from '../../actions';
import { RepoState, RepoStatus } from '../../reducers/status';

const stateColor = {
  [RepoState.CLONING]: 'secondary',
  [RepoState.DELETING]: 'accent',
  [RepoState.INDEXING]: 'primary',
};

class CodeProjectItem extends React.PureComponent<
  {
    project: Repository;
    enableManagement: boolean;
    showStatus: boolean;
    status?: RepoStatus;
    deleteRepo?: (uri: string) => void;
    indexRepo?: (uri: string) => void;
    initRepoCommand?: (uri: string) => void;
    openSettings?: (uri: string, url: string) => void;
  },
  { showReindexConfirmModal: boolean; showDeleteConfirmModal: boolean }
> {
  state = {
    showDeleteConfirmModal: false,
    showReindexConfirmModal: false,
  };

  openReindexModal = () => {
    this.setState({ showReindexConfirmModal: true });
  };

  closeReindexModal = () => {
    this.setState({ showReindexConfirmModal: false });
  };

  openDeleteModal = () => {
    this.setState({ showDeleteConfirmModal: true });
  };

  closeDeleteModal = () => {
    this.setState({ showDeleteConfirmModal: false });
  };

  confirmDelete = () => {
    if (this.props.deleteRepo) {
      this.props.deleteRepo(this.props.project.uri);
      this.closeDeleteModal();
    }
  };

  confirmReindex = () => {
    if (this.props.indexRepo) {
      this.props.indexRepo(this.props.project.uri);
      this.closeReindexModal();
    }
  };

  public render() {
    const { project, showStatus, status, enableManagement } = this.props;
    const { name, org, uri, url } = project;
    const onClickSettings = () => this.props.openSettings && this.props.openSettings(uri, url);
    let footer = null;
    let disableRepoLink = false;
    let hasError = false;
    if (!status) {
      footer = <div className="codeFooter">INIT...</div>;
    } else if (status.state === RepoState.READY) {
      footer = (
        <div className="codeFooter" data-test-subj="repositoryIndexDone">
          LAST UPDATED: {moment(status.timestamp).fromNow()}
        </div>
      );
    } else if (status.state === RepoState.DELETING) {
      footer = <div className="codeFooter">DELETING...</div>;
    } else if (status.state === RepoState.INDEXING) {
      footer = (
        <div className="codeFooter" data-test-subj="repositoryIndexOngoing">
          INDEXING...
        </div>
      );
    } else if (status.state === RepoState.CLONING) {
      footer = <div className="codeFooter">CLONING...</div>;
    } else if (status.state === RepoState.DELETE_ERROR) {
      footer = <div className="codeFooter codeFooter--error">ERROR DELETE REPO</div>;
      hasError = true;
    } else if (status.state === RepoState.INDEX_ERROR) {
      footer = <div className="codeFooter codeFooter--error">ERROR INDEX REPO</div>;
      hasError = true;
    } else if (status.state === RepoState.CLONE_ERROR) {
      footer = (
        <div className="codeFooter codeFooter--error">
          ERROR CLONING REPO&nbsp;
          <EuiToolTip position="top" content={status.errorMessage}>
            <EuiIcon type="iInCircle" />
          </EuiToolTip>
        </div>
      );
      // Disable repo link is clone failed.
      disableRepoLink = true;
      hasError = true;
    }

    const repoTitle = (
      <EuiText data-test-subj="codeRepositoryItem">
        <EuiTextColor color="subdued">{org}</EuiTextColor>/<strong>{name}</strong>
      </EuiText>
    );

    const settingsShow =
      status && status.state !== RepoState.CLONING && status.state !== RepoState.DELETING;
    const settingsVisibility = settingsShow ? 'visible' : 'hidden';

    const indexShow =
      status &&
      status.state !== RepoState.CLONING &&
      status.state !== RepoState.DELETING &&
      status.state !== RepoState.INDEXING &&
      status.state !== RepoState.CLONE_ERROR;
    const indexVisibility = indexShow ? 'visible' : 'hidden';

    const deleteShow = status && status.state !== RepoState.DELETING;
    const deleteVisibility = deleteShow ? 'visible' : 'hidden';

    const projectManagement = (
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={false} style={{ display: 'none' }}>
            <div
              className="codeButton__project"
              data-test-subj="settingsRepositoryButton"
              tabIndex={0}
              onKeyPress={onClickSettings}
              onClick={onClickSettings}
              role="button"
              style={{ visibility: settingsVisibility }}
            >
              <EuiIcon type="gear" />
              <EuiText size="xs" color="subdued">
                Settings
              </EuiText>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div
              className="codeButton__project"
              data-test-subj="indexRepositoryButton"
              tabIndex={0}
              onKeyPress={this.openReindexModal}
              onClick={this.openReindexModal}
              role="button"
              style={{ visibility: indexVisibility }}
            >
              <EuiIcon type="indexSettings" />
              <EuiText size="xs" color="subdued">
                Reindex
              </EuiText>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div
              className="codeButton__project"
              data-test-subj="deleteRepositoryButton"
              tabIndex={0}
              onKeyPress={this.openDeleteModal}
              onClick={this.openDeleteModal}
              role="button"
              style={{ visibility: deleteVisibility }}
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

    const repoStatus = (
      <EuiText>
        <h6>
          <EuiTextColor color="subdued">{footer}</EuiTextColor>
        </h6>
      </EuiText>
    );

    return (
      <EuiPanel
        className={hasError ? 'codePanel__project codePanel__project--error' : 'codePanel__project'}
      >
        {this.renderProgress()}
        <EuiFlexGroup alignItems="center" justifyContent="flexStart">
          <EuiFlexItem grow={3}>
            {disableRepoLink ? (
              repoTitle
            ) : (
              <Link to={`/${uri}`} data-test-subj={`adminLinkTo${name}`}>
                {repoTitle}
              </Link>
            )}
            {showStatus ? repoStatus : null}
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiText color="subdued" size="s">
              <EuiLink href={'https://' + uri} target="_blank">
                {uri}
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
          {enableManagement && projectManagement}
        </EuiFlexGroup>
        {this.state.showDeleteConfirmModal && this.renderDeleteConfirmModal()}
        {this.state.showReindexConfirmModal && this.renderReindexConfirmModal()}
      </EuiPanel>
    );
  }

  renderReindexConfirmModal = () => {
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title="Reindex this repository?"
          onCancel={this.closeReindexModal}
          onConfirm={this.confirmReindex}
          cancelButtonText="No, don't do it"
          confirmButtonText="Yes, do it"
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        />
      </EuiOverlayMask>
    );
  };

  renderDeleteConfirmModal = () => {
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title="Delete this repository?"
          onCancel={this.closeDeleteModal}
          onConfirm={this.confirmDelete}
          cancelButtonText="No, don't do it"
          confirmButtonText="Yes, do it"
          buttonColor="danger"
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
        />
      </EuiOverlayMask>
    );
  };

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
