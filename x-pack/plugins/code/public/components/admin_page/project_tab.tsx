/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiGlobalToastList,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  // @ts-ignore
  EuiSuperSelect,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import moment from 'moment';
import React, { ChangeEvent } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Repository } from '../../../model';
import { closeToast, importRepo } from '../../actions';
import { RepoStatus, RootState } from '../../reducers';
import { ToastType } from '../../reducers/repository';
import { isImportRepositoryURLInvalid } from '../../utils/url';
import { ProjectItem } from './project_item';
import { ProjectSettings } from './project_settings';

const NewProjectButton = styled(EuiButton)`
  margin-top: 1.5rem;
`;

enum SortOptionsValue {
  alphabetical_asc = 'alphabetical_asc',
  alphabetical_desc = 'alphabetical_desc',
  updated_asc = 'updated_asc',
  updated_desc = 'updated_desc',
  recently_added = 'recently_added',
}

const sortFunctionsFactory = (status: { [key: string]: RepoStatus }) => {
  const sortFunctions: { [k: string]: (a: Repository, b: Repository) => number } = {
    [SortOptionsValue.alphabetical_asc]: (a: Repository, b: Repository) =>
      a.name!.localeCompare(b.name!),
    [SortOptionsValue.alphabetical_desc]: (a: Repository, b: Repository) =>
      b.name!.localeCompare(a.name!),
    [SortOptionsValue.updated_asc]: (a: Repository, b: Repository) =>
      moment(status[b.uri].timestamp).diff(moment(status[a.uri].timestamp)),
    [SortOptionsValue.updated_desc]: (a: Repository, b: Repository) =>
      moment(status[a.uri].timestamp).diff(moment(status[b.uri].timestamp)),
    [SortOptionsValue.recently_added]: () => {
      return -1;
    },
  };
  return sortFunctions;
};

const sortOptions = [
  { value: SortOptionsValue.alphabetical_asc, inputDisplay: 'A to Z' },
  { value: SortOptionsValue.alphabetical_desc, inputDisplay: 'Z to A' },
  { value: SortOptionsValue.updated_asc, inputDisplay: 'Last Updated ASC' },
  { value: SortOptionsValue.updated_desc, inputDisplay: 'Last Updated DESC' },
  // { value: SortOptionsValue.recently_added, inputDisplay: 'Recently Added' },
];

interface Props {
  projects: Repository[];
  status: { [key: string]: RepoStatus };
  isAdmin: boolean;
  importRepo: (repoUrl: string) => void;
  importLoading: boolean;
  toastMessage?: string;
  showToast: boolean;
  toastType: ToastType;
  closeToast: () => void;
}
interface State {
  showImportProjectModal: boolean;
  importLoading: boolean;
  settingModal: { url?: string; uri?: string; show: boolean };
  repoURL: string;
  isInvalid: boolean;
  sortOption: SortOptionsValue;
}

class CodeProjectTab extends React.PureComponent<Props, State> {
  public static getDerivedStateFromProps(props: Readonly<Props>, state: State) {
    if (state.importLoading && !props.importLoading) {
      return { showImportProjectModal: false, importLoading: props.importLoading, repoURL: '' };
    }
    return { importLoading: props.importLoading };
  }

  constructor(props: Props) {
    super(props);
    this.state = {
      importLoading: false,
      showImportProjectModal: false,
      settingModal: { show: false },
      repoURL: '',
      sortOption: SortOptionsValue.alphabetical_asc,
      isInvalid: false,
    };
  }

  public closeModal = () => {
    this.setState({ showImportProjectModal: false, repoURL: '', isInvalid: false });
  };

  public openModal = () => {
    this.setState({ showImportProjectModal: true });
  };

  public openSettingModal = (uri: string, url: string) => {
    this.setState({ settingModal: { uri, url, show: true } });
  };

  public closeSettingModal = () => {
    this.setState({ settingModal: { show: false } });
  };

  public onChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      repoURL: e.target.value,
      isInvalid: isImportRepositoryURLInvalid(e.target.value),
    });
  };

  public submitImportProject = () => {
    if (!isImportRepositoryURLInvalid(this.state.repoURL)) {
      this.props.importRepo(this.state.repoURL);
    } else if (!this.state.isInvalid) {
      this.setState({ isInvalid: true });
    }
  };

  public updateIsInvalid = () => {
    this.setState({ isInvalid: isImportRepositoryURLInvalid(this.state.repoURL) });
  };

  public renderImportModal = () => {
    return (
      <EuiOverlayMask>
        <EuiModal onClose={this.closeModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>Add New Project</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiTitle size="xs">
              <h3>Repository URL</h3>
            </EuiTitle>
            <EuiForm>
              <EuiFormRow isInvalid={this.state.isInvalid} error="This field shouldn't be empty.">
                <EuiFieldText
                  value={this.state.repoURL}
                  onChange={this.onChange}
                  onBlur={this.updateIsInvalid}
                  placeholder="https://github.com/elastic/elasticsearch"
                  aria-label="input project url"
                  data-test-subj="importRepositoryUrlInputBox"
                  isLoading={this.props.importLoading}
                  fullWidth={true}
                  isInvalid={this.state.isInvalid}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton onClick={this.closeModal}>Cancel</EuiButton>
            <EuiButton fill onClick={this.submitImportProject} disabled={this.props.importLoading}>
              Import Project
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  };

  public setSortOption = (value: string) => {
    this.setState({ sortOption: value as SortOptionsValue });
  };

  public render() {
    const { projects, isAdmin, status, toastMessage, showToast, toastType } = this.props;
    const projectsCount = projects.length;
    const modal = this.state.showImportProjectModal && this.renderImportModal();

    const sortedProjects = projects.sort(sortFunctionsFactory(status)[this.state.sortOption]);

    const repoList = sortedProjects.map((repo: Repository) => (
      <ProjectItem
        openSettings={this.openSettingModal}
        key={repo.uri}
        project={repo}
        showStatus={true}
        status={status[repo.uri]}
        enableManagement={isAdmin}
      />
    ));

    let settings = null;
    if (this.state.settingModal.show) {
      settings = (
        <ProjectSettings
          onClose={this.closeSettingModal}
          repoUri={this.state.settingModal.uri}
          url={this.state.settingModal.url}
        />
      );
    }

    return (
      <div className="code-sidebar" data-test-subj="codeRepositoryList">
        {showToast && (
          <EuiGlobalToastList
            toasts={[{ title: '', color: toastType, text: toastMessage, id: toastMessage || '' }]}
            dismissToast={this.props.closeToast}
            toastLifeTimeMs={6000}
          />
        )}
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Sort By">
              <EuiSuperSelect
                options={sortOptions}
                valueOfSelected={this.state.sortOption}
                onChange={this.setSortOption}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow />
          <EuiFlexItem grow />
          <EuiFlexItem>
            {isAdmin && (
              // @ts-ignore
              <NewProjectButton onClick={this.openModal} data-test-subj="newProjectButton">
                Add New Project
              </NewProjectButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiText>
          <h3>
            {projectsCount}
            {projectsCount === 1 ? <span> Project</span> : <span> Projects</span>}
          </h3>
        </EuiText>
        <EuiSpacer />
        {repoList}
        {modal}
        {settings}
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  projects: state.repository.repositories,
  status: state.status.status,
  isAdmin: state.userProfile.isCodeAdmin,
  importLoading: state.repository.importLoading,
  toastMessage: state.repository.toastMessage,
  toastType: state.repository.toastType,
  showToast: state.repository.showToast,
});

const mapDispatchToProps = {
  importRepo,
  closeToast,
};

export const ProjectTab = connect(
  mapStateToProps,
  mapDispatchToProps
  // @ts-ignore
)(CodeProjectTab);
