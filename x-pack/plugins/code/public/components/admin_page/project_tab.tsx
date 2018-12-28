/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Repository } from 'x-pack/plugins/code/model';
import { RootState } from '../../reducers';
import { ImportProject } from './import_project';
import { ProjectItem } from './project_item';

const NewProjectButton = styled(EuiButton)`
  margin-top: 1.5rem;
`;

// TODO(qianliang)
const sortOptions = [
  { value: 'alpabetical_asc', text: 'A to Z' },
  { value: 'alpabetical_desc', text: 'Z to A' },
  { value: 'updated_asc', text: 'Last Updated ASC' },
  { value: 'updated_desc', text: 'Last Updated DESC' },
  { value: 'recently_added', text: 'Recently Added' },
];

class CodeProjectTab extends React.PureComponent<
  { projects: Repository[]; status: any; isAdmin: boolean },
  { showImportProjectModal: boolean }
> {
  public state = {
    showImportProjectModal: false,
  };

  public closeModal = () => {
    this.setState({ showImportProjectModal: false });
  };

  public openModal = () => {
    this.setState({ showImportProjectModal: true });
  };

  public render() {
    const { projects, isAdmin } = this.props;
    const projectsCount = projects.length;
    const modal = this.state.showImportProjectModal && (
      <EuiModal onClose={this.closeModal}>
        <ImportProject />
      </EuiModal>
    );

    const repoList = projects.map((repo: any) => (
      <ProjectItem key={repo.uri} project={repo} status={status[repo.uri]} isAdmin={isAdmin} />
    ));

    return (
      <div className="code-sidebar" data-test-subj="codeRepositoryList">
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Sort By">
              <EuiSelect options={sortOptions} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Apply Filters">
              {/*
                // @ts-ignore */}
              <EuiSelect />
            </EuiFormRow>
          </EuiFlexItem>
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
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  projects: state.repository.repositories,
  status: state.status.status,
  isAdmin: state.userConfig.isAdmin,
});

const mapDispatchToProps = {};

export const ProjectTab = connect(
  mapStateToProps,
  mapDispatchToProps
)(CodeProjectTab);
