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
  EuiSearchBar,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { any } from 'joi';
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

// TODO
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

  public render() {
    const { projects, isAdmin } = this.props;
    const projectsCount = projects.length;
    const modal = this.state.showImportProjectModal && (
      <EuiModal onClose={this.closeModal}>
        <ImportProject />
      </EuiModal>
    );

    const repoList = projects.map(repo => (
      <ProjectItem key={repo.uri} project={repo} status={status[repo.uri]} isAdmin={isAdmin} />
    ));

    return (
      <div>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Sort By">
              <EuiSelect options={sortOptions} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Apply Filters">
              <EuiSelect />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow />
          <EuiFlexItem>
            <NewProjectButton>Add New Project</NewProjectButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiText>
          <h3>{projectsCount}Project(s)</h3> 13175545191
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
