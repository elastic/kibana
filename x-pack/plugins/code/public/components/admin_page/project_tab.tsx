/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
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
import React, { ChangeEvent } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Repository } from 'x-pack/plugins/code/model';
import { importRepo } from '../../actions';
import { RootState } from '../../reducers';
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

const sortFunctions: { [k: string]: (a: Repository, b: Repository) => number } = {
  [SortOptionsValue.alphabetical_asc]: (a: Repository, b: Repository) =>
    a.name!.localeCompare(b.name!),
  [SortOptionsValue.alphabetical_desc]: (a: Repository, b: Repository) =>
    b.name!.localeCompare(a.name!),
  [SortOptionsValue.updated_asc]: () => -1,
  [SortOptionsValue.updated_desc]: () => -1,
  [SortOptionsValue.recently_added]: () => -1,
};

const sortOptions = [
  { value: SortOptionsValue.alphabetical_asc, inputDisplay: 'A to Z' },
  { value: SortOptionsValue.alphabetical_desc, inputDisplay: 'Z to A' },
  { value: SortOptionsValue.updated_asc, inputDisplay: 'Last Updated ASC' },
  { value: SortOptionsValue.updated_desc, inputDisplay: 'Last Updated DESC' },
  { value: SortOptionsValue.recently_added, inputDisplay: 'Recently Added' },
];

interface Props {
  projects: Repository[];
  status: any;
  isAdmin: boolean;
  importRepo: (repoUrl: string) => void;
  importLoading: boolean;
}
interface State {
  showImportProjectModal: boolean;
  settingModal: { url?: string; uri?: string; show: boolean };
  repoURL: string;
  sortOption: SortOptionsValue;
}

class CodeProjectTab extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      showImportProjectModal: false,
      settingModal: { show: false },
      repoURL: '',
      sortOption: SortOptionsValue.alphabetical_asc,
    };
  }

  public closeModal = () => {
    this.setState({ showImportProjectModal: false });
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
    });
  };

  public submitImportProject = () => {
    this.props.importRepo(this.state.repoURL);
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
              <EuiFormRow>
                <EuiFieldText
                  value={this.state.repoURL}
                  onChange={this.onChange}
                  placeholder="https://github.com/elastic/elasticsearch"
                  aria-label="input project url"
                  data-test-subj="importRepositoryUrlInputBox"
                  isLoading={this.props.importLoading}
                  fullWidth={true}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton onClick={this.closeModal}>Cancel</EuiButton>
            <EuiButton fill onClick={this.submitImportProject}>
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
    const { projects, isAdmin, status } = this.props;
    const projectsCount = projects.length;
    const modal = this.state.showImportProjectModal && this.renderImportModal();

    const sortedProjects = projects.sort(sortFunctions[this.state.sortOption]);

    const repoList = sortedProjects.map((repo: Repository) => (
      <ProjectItem
        openSettings={this.openSettingModal}
        key={repo.uri}
        project={repo}
        status={status[repo.uri]}
        isAdmin={isAdmin}
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
            {/*
              // @ts-ignore */}
            <NewProjectButton onClick={this.openModal}>Add New Project</NewProjectButton>
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
  isAdmin: state.userConfig.isAdmin,
  importLoading: state.repository.importLoading,
});

const mapDispatchToProps = {
  importRepo,
};

export const ProjectTab = connect(
  mapStateToProps,
  mapDispatchToProps
)(CodeProjectTab);
